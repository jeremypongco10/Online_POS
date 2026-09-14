<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\PaymentModel;
use App\Models\StoreModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Config\Services;

/**
 * POST /api/v1/system/reset — puts this company's configuration back to
 * the state a brand-new install starts in.
 *
 * Scope is configuration only: branches, terminals, payment methods, tax
 * rates, invoice numbering, cash sessions, readings, and every
 * company-level setting. Products, categories, suppliers and customers
 * are deliberately left alone — those are catalogue records a business
 * keeps across a reconfiguration.
 *
 * REFUSED once the system has traded. Two foreign keys make this
 * non-negotiable rather than merely prudent:
 *
 *   - sales.store_id -> stores is ON DELETE CASCADE, so deleting a
 *     branch would silently delete every invoice issued from it. This
 *     system's whole numbering design rests on invoices being permanent;
 *     an endpoint that quietly erases them would undo that in one call.
 *   - products.tax_rate_id -> tax_rates is also CASCADE, so clearing tax
 *     rates would take the PRODUCTS using them with it — exactly the
 *     catalogue this reset promises to preserve. Handled below by
 *     detaching products from their rates first.
 *
 * So the guard is not "are you sure" — it is that a reset is only a
 * coherent operation on a system that has never issued an invoice,
 * taken a refund, or raised a purchase order.
 */
class SystemResetController extends BaseApiController
{
    /**
     * Deleted in dependency order, children first. Each entry is a table
     * and the column naming the company's own rows — either directly, or
     * via the store/register ids collected below.
     */
    public function reset(): ResponseInterface
    {
        $auth = Services::authContext();
        $companyId = $auth->companyId;
        $payload = $this->request->getJSON(true) ?? [];

        // Typed confirmation, checked server-side too. The dialog asks
        // for it as well, but a destructive endpoint should not be one
        // stray POST away from firing for anything holding the token.
        if (($payload['confirm'] ?? null) !== 'RESET') {
            return $this->apiFail('Send confirm: "RESET" to run this.', 422);
        }

        $db = Database::connect();
        $storeIds = model(StoreModel::class)->where('company_id', $companyId)->findColumn('id') ?: [];
        $registerIds = $storeIds === []
            ? []
            : (array_column($db->table('registers')->select('id')->whereIn('store_id', $storeIds)->get()->getResultArray(), 'id') ?: []);

        $blockers = $this->blockers($db, $companyId, $storeIds);
        if ($blockers !== []) {
            return $this->apiFail(
                'This system has already been used for real business (' . implode(', ', $blockers)
                . '). Configuration that produced issued documents has to stay with them, so a reset is only available before the first sale.',
                409
            );
        }

        $db->transStart();

        // Detach before deleting the rates, or the CASCADE takes the
        // products with them — see this class's own note.
        $db->table('products')->where('company_id', $companyId)->update(['tax_rate_id' => null]);

        if ($registerIds !== []) {
            $sessionIds = array_column(
                $db->table('cash_sessions')->select('id')->whereIn('register_id', $registerIds)->get()->getResultArray(),
                'id'
            );
            if ($sessionIds !== []) {
                $db->table('cash_movements')->whereIn('cash_session_id', $sessionIds)->delete();
            }
            $db->table('cash_sessions')->whereIn('register_id', $registerIds)->delete();
            $db->table('transaction_counters')->whereIn('register_id', $registerIds)->delete();
        }

        if ($storeIds !== []) {
            $db->table('z_readings')->whereIn('store_id', $storeIds)->delete();
            $db->table('invoice_series')->whereIn('store_id', $storeIds)->delete();
            $db->table('invoice_sequences')->whereIn('store_id', $storeIds)->delete();
            $db->table('inventory_transactions')->whereIn('store_id', $storeIds)->delete();
            $db->table('inventory')->whereIn('store_id', $storeIds)->delete();
            $db->table('store_product_prices')->whereIn('store_id', $storeIds)->delete();
            $db->table('user_stores')->whereIn('store_id', $storeIds)->delete();
            $db->table('registers')->whereIn('store_id', $storeIds)->delete();
            $db->table('stores')->whereIn('id', $storeIds)->delete();
        }

        $db->table('tax_rates')->where('company_id', $companyId)->delete();
        $db->table('payment_methods')->where('company_id', $companyId)->delete();

        // Cash is the one method the rest of the system assumes exists
        // (PaymentPanel defaults to it before any method list loads), so
        // a reset leaves it behind rather than a company with no way to
        // take money at all.
        $db->table('payment_methods')->insert([
            'company_id' => $companyId,
            'name' => 'Cash',
            'code' => PaymentModel::METHOD_CASH,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Every company-level setting back to its column default. The
        // trade name stays — it is the tenant's identity, not a setting,
        // and blanking it would leave the account nameless.
        $db->table('companies')->where('id', $companyId)->update([
            'legal_name' => null,
            'tax_id' => null,
            'is_vat_registered' => 0,
            'vat_registration_number' => null,
            'is_bir_registered' => 1,
            'address' => null,
            'phone' => null,
            'email' => null,
            'currency' => 'PHP',
            'tax_system' => 'vat',
            'loyalty_points_per_100' => 0,
            'pos_lock_idle_minutes' => 0,
            'require_item_void_approval' => 0,
            'require_cancel_approval' => 1,
            'require_manual_discount_approval' => 1,
            'default_regular_discount_percent' => null,
            'default_promo_discount_percent' => null,
            'default_employee_discount_percent' => null,
            'default_member_discount_percent' => null,
            'default_wholesale_discount_percent' => null,
            'transaction_no_reset_rule' => 'per_session',
            'transaction_no_prefix' => null,
            'transaction_no_length' => 0,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('The reset could not be completed and nothing was changed.', 500);
        }

        Services::auditLogger()->log('reset', 'System Configuration', $companyId, 'Configuration reset to a new-setup state', []);

        return $this->ok(['reset' => true], 'Configuration reset. Work through the Setup Guide to configure the system again.');
    }

    /**
     * Human-readable reasons this company has already traded. Empty means
     * a reset is safe to run.
     */
    private function blockers($db, int $companyId, array $storeIds): array
    {
        $blockers = [];

        $sales = (int) $db->table('sales')->where('company_id', $companyId)->countAllResults();
        if ($sales > 0) {
            $blockers[] = $sales . ' sale' . ($sales === 1 ? '' : 's');
        }

        if ($storeIds !== []) {
            $returns = (int) $db->table('returns')->whereIn('store_id', $storeIds)->countAllResults();
            if ($returns > 0) {
                $blockers[] = $returns . ' return' . ($returns === 1 ? '' : 's');
            }

            $orders = (int) $db->table('purchase_orders')->whereIn('store_id', $storeIds)->countAllResults();
            if ($orders > 0) {
                $blockers[] = $orders . ' purchase order' . ($orders === 1 ? '' : 's');
            }
        }

        return $blockers;
    }

    /**
     * GET /api/v1/system/reset-eligibility
     *
     * Lets the dialog say up front whether the button will work, instead
     * of offering a reset that is going to be refused the moment it is
     * pressed.
     */
    public function eligibility(): ResponseInterface
    {
        $auth = Services::authContext();
        $db = Database::connect();
        $storeIds = model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];
        $blockers = $this->blockers($db, $auth->companyId, $storeIds);

        return $this->ok([
            'can_reset' => $blockers === [],
            'blockers' => $blockers,
        ]);
    }
}
