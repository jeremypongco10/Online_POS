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

    protected function generateCustomerCode(array $data): array
    {
        if (empty($data['data']['customer_code'])) {
            $data['data']['customer_code'] = 'CUST-' . strtoupper(bin2hex(random_bytes(4)));
        }

        return $data;
    }
}
