<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

/**
 * Seeds the default role set and their permission grants.
 *
 * Depends on CompanySeeder (roles are company-scoped) and
 * PermissionSeeder (role_permissions references permission slugs).
 */
class RoleSeeder extends Seeder
{
    public function run()
    {
        $company = $this->db->table('companies')->get()->getFirstRow();

        if (! $company) {
            log_message('error', 'RoleSeeder: no company found. Run CompanySeeder first.');
            return;
        }

        $permissionRows = $this->db->table('permissions')->get()->getResult();
        $permissionIdBySlug = [];
        foreach ($permissionRows as $row) {
            $permissionIdBySlug[$row->slug] = $row->id;
        }

        // Super Admin / Company Admin get every permission that exists,
        // read straight from the permissions table so this never drifts
        // out of sync with PermissionSeeder.
        $allSlugs = array_keys($permissionIdBySlug);

        $roles = [
            'Super Admin' => [
                'description' => 'Full access across the entire system',
                'permissions' => $allSlugs,
            ],
            'Company Admin' => [
                'description' => 'Full access within their company',
                'permissions' => $allSlugs,
            ],
            // Same full permission set as Company Admin — "store" is
            // purely about which stores the user is assigned to via
            // Store Access (user_stores), not a narrower permission set.
            // A Store Admin with no store restrictions behaves exactly
            // like a Company Admin.
            'Store Admin' => [
                'description' => 'Full access, typically scoped to specific stores via Store Access',
                'permissions' => $allSlugs,
            ],
            'Store Manager' => [
                'description' => 'Manages day-to-day store operations',
                'permissions' => [
                    'products.view',
                    'inventory.view', 'inventory.adjust', 'inventory.transfer',
                    'sales.create', 'sales.view', 'sales.void', 'sales.refund',
                    'customers.view', 'customers.create', 'customers.update',
                    'loyalty.view', 'loyalty.manage',
                    'dashboard.view', 'reports.view',
                    'users.view',
                    'stores.view', 'stores.manage',
                    'categories.view', 'categories.manage',
                    'units.view', 'taxes.view',
                    'suppliers.view', 'suppliers.manage',
                    'purchases.view', 'purchases.create', 'purchases.manage',
                    'registers.view', 'registers.manage',
                    'cash-sessions.view', 'cash-sessions.manage',
                    'payments.view',
                    // A manager can both request AND approve — the only
                    // role below Company Admin trusted to authorize a
                    // refund themselves.
                    'returns.view', 'returns.create', 'returns.approve',
                ],
            ],
            // Sits between Cashier and Store Manager: the same day-to-day
            // register permissions as Cashier, plus the two actions that
            // specifically need a supervisor override — voiding a sale and
            // approving a return (which issues the refund). Everything else
            // Store Manager can do (stores.manage, purchasing, users.view,
            // etc.) stays out of reach.
            'Cashier Supervisor' => [
                'description' => 'Supervises cashiers — can void sales and approve returns',
                'permissions' => [
                    'products.view',
                    'inventory.view',
                    'sales.create', 'sales.view', 'sales.void',
                    'customers.view', 'customers.create',
                    'loyalty.view', 'loyalty.manage',
                    'categories.view', 'units.view', 'taxes.view',
                    'stores.view', 'registers.view',
                    'cash-sessions.view', 'cash-sessions.manage',
                    'payments.view',
                    'returns.view', 'returns.create', 'returns.approve',
                ],
            ],
            'Cashier' => [
                'description' => 'Rings up sales at the register',
                'permissions' => [
                    'products.view',
                    'inventory.view',
                    'sales.create', 'sales.view',
                    'customers.view', 'customers.create',
                    'loyalty.view', 'loyalty.manage',
                    'categories.view', 'units.view', 'taxes.view',
                    // stores.view/registers.view: read-only, needed for the
                    // POS screen's store/register selector — not stores.manage.
                    'stores.view', 'registers.view',
                    'cash-sessions.view', 'cash-sessions.manage',
                    'payments.view',
                    // Can request a return but deliberately NOT approve one
                    // — approving issues the refund, and that authority is
                    // reserved for Cashier Supervisor and above.
                    'returns.view', 'returns.create',
                ],
            ],
            'Bagger' => [
                'description' => 'Assists with packing and stock visibility only',
                'permissions' => [
                    'products.view',
                    'inventory.view',
                ],
            ],
        ];

        $now = date('Y-m-d H:i:s');

        foreach ($roles as $roleName => $definition) {
            $existingRole = $this->db->table('roles')
                ->where('company_id', $company->id)
                ->where('name', $roleName)
                ->get()->getFirstRow();

            if ($existingRole) {
                $roleId = $existingRole->id;
            } else {
                $this->db->table('roles')->insert([
                    'company_id' => $company->id,
                    'name' => $roleName,
                    'description' => $definition['description'],
                    'is_system' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $roleId = $this->db->insertID();
            }

            foreach ($definition['permissions'] as $slug) {
                if (! isset($permissionIdBySlug[$slug])) {
                    continue;
                }

                $permissionId = $permissionIdBySlug[$slug];

                $existingGrant = $this->db->table('role_permissions')
                    ->where('role_id', $roleId)
                    ->where('permission_id', $permissionId)
                    ->get()->getFirstRow();

                if ($existingGrant) {
                    continue;
                }

                $this->db->table('role_permissions')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                    'created_at' => $now,
                ]);
            }
        }
    }
}
