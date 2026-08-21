<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * slug => [name, description]
     */
    private array $permissions = [
        'products.view' => ['View Products', 'Can view product records'],
        'products.create' => ['Create Products', 'Can create new products'],
        'products.update' => ['Update Products', 'Can edit existing products'],
        'products.delete' => ['Delete Products', 'Can delete products'],

        'inventory.view' => ['View Inventory', 'Can view stock levels'],
        'inventory.adjust' => ['Adjust Inventory', 'Can make manual stock adjustments'],
        'inventory.transfer' => ['Transfer Inventory', 'Can transfer stock between stores'],

        'sales.create' => ['Create Sales', 'Can ring up new sales'],
        'sales.view' => ['View Sales', 'Can view sales history'],
        'sales.void' => ['Void Sales', 'Can void a sale'],
        'sales.refund' => ['Refund Sales', 'Can process a refund'],

        'customers.view' => ['View Customers', 'Can view customer records'],
        'customers.create' => ['Create Customers', 'Can create new customers'],
        'customers.update' => ['Update Customers', 'Can edit existing customers'],

        'loyalty.view' => ['View Loyalty', 'Can view loyalty card balances and points'],
        'loyalty.manage' => ['Manage Loyalty', 'Can issue cards and adjust points/balance'],

        'reports.view' => ['View Reports', 'Can view sales and inventory reports'],

        'users.view' => ['View Users', 'Can view user accounts'],
        'users.create' => ['Create Users', 'Can create new user accounts'],
        'users.update' => ['Update Users', 'Can edit existing user accounts'],

        'stores.view' => ['View Stores', 'Can view store records'],
        'stores.manage' => ['Manage Stores', 'Can create and edit stores'],

        // The following extend beyond the original example list to give
        // every API resource group (Phase 3) real authorization coverage.
        'companies.view' => ['View Companies', 'Can view company records'],
        'companies.manage' => ['Manage Companies', 'Can create and edit companies'],

        'roles.view' => ['View Roles', 'Can view roles and their permissions'],
        'roles.manage' => ['Manage Roles', 'Can create/edit roles and assign permissions'],

        'categories.view' => ['View Categories', 'Can view product categories'],
        'categories.manage' => ['Manage Categories', 'Can create and edit categories'],

        'units.view' => ['View Units', 'Can view units of measure'],
        'units.manage' => ['Manage Units', 'Can create and edit units of measure'],

        'taxes.view' => ['View Taxes', 'Can view tax rate configuration'],
        'taxes.manage' => ['Manage Taxes', 'Can create and edit tax rates'],

        'suppliers.view' => ['View Suppliers', 'Can view supplier records'],
        'suppliers.manage' => ['Manage Suppliers', 'Can create and edit suppliers'],

        'purchases.view' => ['View Purchases', 'Can view purchase orders'],
        'purchases.create' => ['Create Purchases', 'Can create purchase orders'],
        'purchases.manage' => ['Manage Purchases', 'Can edit and receive purchase orders'],

        'registers.view' => ['View Registers', 'Can view POS registers'],
        'registers.manage' => ['Manage Registers', 'Can create and edit registers'],

        'cash-sessions.view' => ['View Cash Sessions', 'Can view cash drawer sessions'],
        'cash-sessions.manage' => ['Manage Cash Sessions', 'Can open and close cash drawer sessions'],

        'payments.view' => ['View Payments', 'Can view sale payments'],

        'returns.view' => ['View Returns', 'Can view sales returns'],
        'returns.create' => ['Create Returns', 'Can request a sales return'],
        // Deliberately separate from returns.create: approving is what
        // actually issues the refund and restocks inventory, so a
        // cashier who can request a return should not necessarily be
        // able to authorize their own refund.
        'returns.approve' => ['Approve Returns', 'Can approve a pending return, issuing the refund and restocking inventory'],
    ];

    public function run()
    {
        $now = date('Y-m-d H:i:s');

        foreach ($this->permissions as $slug => [$name, $description]) {
            $exists = $this->db->table('permissions')->where('slug', $slug)->get()->getFirstRow();

            if ($exists) {
                continue;
            }

            $this->db->table('permissions')->insert([
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
