<?php

namespace App\Libraries;

use App\Models\RegisterModel;
use Config\Database;

/**
 * The figures behind an X-reading and a Z-reading.
 *
 * One computation serves both: an X-reading is this read mid-shift and
 * thrown away, a Z-reading is this read at close, written to z_readings
 * and counted. Keeping them on one code path is the point — a Z that
 * disagreed with the X taken a minute earlier would be a defect an
 * examiner could see, so there is deliberately no second implementation
 * for them to drift apart in.
 *
 * Everything here reads the sale's own frozen columns — sale_items
 * .tax_type and .discount_type as they were written at checkout, not the
 * tax rate or discount definition as it stands today. A rate renamed or
 * a discount reconfigured next year must not change what a terminal
 * reported this year.
 *
 * Training sales (sales.is_training) are excluded everywhere, as are
 * voided ones from the sales figures — voids are reported separately,
 * which is what BIR asks for: not a quietly smaller total, but the total
 * and the voids that were taken out of it.
 *
 * IMPORTANT — same caveat as TaxService: this encodes a good-faith
 * reading of what an accredited terminal has to report, and is not a
 * substitute for BIR/accountant review before a deployment relies on it.
 */
class BirReadingService
{
    /** discount_type values that are statutory, reported on their own lines. */
    private const SC = TaxService::DISCOUNT_SENIOR_CITIZEN;
    private const PWD = TaxService::DISCOUNT_PWD;
    private const BNPC = TaxService::DISCOUNT_SC_PWD_5_BNPC;

    /**
     * @param string $from inclusive datetime, 'Y-m-d H:i:s'
     * @param string $to   inclusive datetime, 'Y-m-d H:i:s'
     */
    public function compute(int $registerId, string $from, string $to): array
    {
        $db = Database::connect();

        $sales = $db->table('sales')
            ->select('id, invoice_number, total, discount_total, status, sale_date')
            ->where('register_id', $registerId)
            ->where('is_training', 0)
            // Start exclusive, end inclusive. The previous Z already
            // claimed everything up to and including its covers_to, so a
            // sale landing on that exact second belongs to that reading,
            // not to this one — `>=` here would put it on both.
            ->where('sale_date >', $from)
            ->where('sale_date <=', $to)
            ->orderBy('id', 'ASC')
            ->get()
            ->getResult();

        $completed = array_values(array_filter($sales, static fn ($s) => $s->status === 'completed'));
        $voided = array_values(array_filter($sales, static fn ($s) => $s->status === 'voided'));

        $totals = [
            'transaction_count' => count($completed),
            'gross_sales' => 0.0,
            'discount_total' => 0.0,
            'net_sales' => 0.0,
            'vatable_sales' => 0.0,
            'vat_amount' => 0.0,
            'vat_exempt_sales' => 0.0,
            'zero_rated_sales' => 0.0,
            'non_vat_sales' => 0.0,
            'sc_discount_total' => 0.0,
            'pwd_discount_total' => 0.0,
            'bnpc_discount_total' => 0.0,
            'other_discount_total' => 0.0,
            'void_count' => count($voided),
            'void_total' => 0.0,
            'return_count' => 0,
            'return_total' => 0.0,
            'beginning_invoice_number' => $completed[0]->invoice_number ?? null,
            'ending_invoice_number' => $completed !== [] ? end($completed)->invoice_number : null,
        ];

        foreach ($voided as $sale) {
            $totals['void_total'] += (float) $sale->total;
        }

        $completedIds = array_map(static fn ($s) => (int) $s->id, $completed);

        if ($completedIds !== []) {
            foreach ($completed as $sale) {
                $totals['net_sales'] += (float) $sale->total;
            }

            $lines = $db->table('sale_items')
                ->select('tax_type, discount_type, discount, tax_amount, line_total')
                ->whereIn('sale_id', $completedIds)
                ->get()
                ->getResult();

            foreach ($lines as $line) {
                $gross = (float) $line->line_total;
                $tax = (float) $line->tax_amount;
                $net = $gross - $tax;
                $discount = (float) $line->discount;

                // Gross here means before discount: net_sales above is what
                // was actually charged, so the two differ by exactly the
                // discounts reported below and reconcile on the reading.
                $totals['gross_sales'] += $gross + $discount;
                $totals['discount_total'] += $discount;

                switch ($line->tax_type) {
                    case TaxService::TYPE_VAT:
                        $totals['vatable_sales'] += $net;
                        $totals['vat_amount'] += $tax;
                        break;
                    case TaxService::TYPE_VAT_EXEMPT:
                        $totals['vat_exempt_sales'] += $net;
                        break;
                    case TaxService::TYPE_ZERO_RATED:
                        $totals['zero_rated_sales'] += $net;
                        break;
                    default:
                        $totals['non_vat_sales'] += $net;
                }

                $bucket = match ($line->discount_type) {
                    self::SC => 'sc_discount_total',
                    self::PWD => 'pwd_discount_total',
                    self::BNPC => 'bnpc_discount_total',
                    default => 'other_discount_total',
                };
                if ($discount > 0) {
                    $totals[$bucket] += $discount;
                }
            }
        }

        // Returns are counted against the window they were made in, not
        // the window of the sale they refund — a refund handed over today
        // is today's cash movement even when the sale it reverses is from
        // last month.
        $returns = $db->table('returns')
            // Qualified: this joins sales, and both tables have an `id`.
            ->select('returns.id, returns.total_refund')
            ->join('sales', 'sales.id = returns.sale_id')
            ->where('sales.register_id', $registerId)
            ->where('returns.status', 'completed')
            ->where('returns.return_date >', $from)
            ->where('returns.return_date <=', $to)
            ->get()
            ->getResult();

        $totals['return_count'] = count($returns);
        foreach ($returns as $return) {
            $totals['return_total'] += (float) $return->total_refund;
        }

        foreach ($totals as $key => $value) {
            if (is_float($value)) {
                $totals[$key] = round($value, 2);
            }
        }

        return $totals;
    }

    /**
     * Adds a completed sale's total to its terminal's lifetime accumulated
     * total, in the same transaction that creates the sale.
     *
     * Deliberately not a SUM() over sales computed when a Z is taken: the
     * grand total is supposed to be a number the machine carries and only
     * ever adds to, which is exactly what makes it hard to quietly restate.
     * A later void doesn't subtract from it either — the void is reported
     * on its own line instead (see compute()).
     */
    public function addToGrandTotal(int $registerId, float $amount): void
    {
        $db = Database::connect();
        $db->query(
            'UPDATE registers SET grand_total = grand_total + ? WHERE id = ?',
            [round($amount, 2), $registerId]
        );
    }

    /** The terminal's accumulated total right now, as printed on a reading. */
    public function grandTotal(int $registerId): float
    {
        return (float) (model(RegisterModel::class)->find($registerId)->grand_total ?? 0);
    }
}
