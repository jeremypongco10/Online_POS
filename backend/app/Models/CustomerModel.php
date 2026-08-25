<?php

namespace App\Models;

use CodeIgniter\Model;

class CustomerModel extends Model
{
    protected $table = 'customers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    // Note: `name` is intentionally excluded from mass-assignment — it's
    // a computed full name (first_name + last_name), maintained by
    // composeFullName() below, so free-text search can hit one column
    // without a CONCAT expression in the generic search helper.
    protected $allowedFields = [
        'company_id', 'customer_code', 'first_name', 'last_name',
        'email', 'mobile', 'address', 'tax_id', 'credit_limit', 'is_active',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'company_id' => 'required|is_natural_no_zero',
        'first_name' => 'required|max_length[75]',
        'last_name' => 'required|max_length[75]',
        'email' => 'permit_empty|valid_email|max_length[150]',
        'mobile' => 'permit_empty|max_length[30]',
        'credit_limit' => 'permit_empty|decimal',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];

    protected $beforeInsert = ['composeFullName', 'generateCustomerCode'];
    protected $beforeUpdate = ['composeFullNameOnUpdate'];

    protected function composeFullName(array $data): array
    {
        $first = $data['data']['first_name'] ?? null;
        $last = $data['data']['last_name'] ?? null;

        if ($first !== null || $last !== null) {
            $data['data']['name'] = trim(($first ?? '') . ' ' . ($last ?? ''));
        }

        return $data;
    }

    /**
     * Updates are partial (PATCH-like — only keys present in the payload
     * are written), so a request touching only first_name must not blank
     * out an untouched last_name when recomposing `name`. Falls back to
     * the current DB value for whichever half wasn't sent.
     */
    protected function composeFullNameOnUpdate(array $data): array
    {
        if (! array_key_exists('first_name', $data['data']) && ! array_key_exists('last_name', $data['data'])) {
            return $data;
        }

        $id = is_array($data['id'] ?? null) ? ($data['id'][0] ?? null) : ($data['id'] ?? null);
        $existing = $id !== null ? $this->find($id) : null;

        $first = $data['data']['first_name'] ?? $existing->first_name ?? '';
        $last = $data['data']['last_name'] ?? $existing->last_name ?? '';

        $data['data']['name'] = trim($first . ' ' . $last);

        return $data;
    }

    /**
     * Format: YYYYMM followed by a 10-digit sequence number that resets
     * each calendar month, scoped per company (e.g. 202608 + 0000000001).
     * The sequence is derived from the highest existing code for this
     * company + month rather than a row count, so a deleted customer
     * mid-month doesn't cause a later insert to reuse its number.
     */
    protected function generateCustomerCode(array $data): array
    {
        if (! empty($data['data']['customer_code'])) {
            return $data;
        }

        $companyId = $data['data']['company_id'] ?? null;
        $prefix = date('Ym');

        $last = $this->select('customer_code')
            ->where('company_id', $companyId)
            ->like('customer_code', $prefix, 'after')
            ->orderBy('customer_code', 'DESC')
            ->first();

        $next = 1;
        if ($last && preg_match('/^\d{16}$/', $last->customer_code)) {
            $next = ((int) substr($last->customer_code, 6)) + 1;
        }

        $data['data']['customer_code'] = $prefix . str_pad((string) $next, 10, '0', STR_PAD_LEFT);

        return $data;
    }
}
