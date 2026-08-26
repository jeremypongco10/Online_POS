<?php

namespace App\Models;

use CodeIgniter\Model;

class CategoryModel extends Model
{
    protected $table = 'categories';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'company_id', 'parent_id', 'name', 'description', 'is_active',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'company_id' => ['label' => 'Company', 'rules' => 'required|is_natural_no_zero'],
        'parent_id' => ['label' => 'Parent category', 'rules' => 'permit_empty|is_natural_no_zero'],
        // Uniqueness on name is (company_id, name) at the DB level, not
        // global — deliberately not validated here (see ProductModel.sku).
        'name' => ['label' => 'Name', 'rules' => 'required|max_length[100]'],
        'description' => ['label' => 'Description', 'rules' => 'permit_empty|max_length[255]'],
        'is_active' => ['label' => 'Active status', 'rules' => 'permit_empty|in_list[0,1]'],
    ];

    /**
     * True if setting $categoryId's parent to $candidateParentId would
     * create a cycle (i.e. $candidateParentId is $categoryId itself, or
     * one of its own descendants).
     */
    public function wouldCreateCycle(int $categoryId, int $candidateParentId): bool
    {
        if ($categoryId === $candidateParentId) {
            return true;
        }

        $current = $this->find($candidateParentId);
        $depth = 0;

        while ($current !== null && $current->parent_id !== null) {
            if ((int) $current->parent_id === $categoryId) {
                return true;
            }

            $current = $this->find($current->parent_id);

            // Schema forbids infinite chains in practice, but bail out
            // defensively rather than looping forever on corrupt data.
            if (++$depth > 1000) {
                return true;
            }
        }

        return false;
    }

    /** All categories for a company, nested as a parent -> children tree. */
    public function treeForCompany(int $companyId): array
    {
        $rows = $this->where('company_id', $companyId)->orderBy('name', 'ASC')->findAll();

        $byParent = [];
        foreach ($rows as $row) {
            $byParent[$row->parent_id ?? 0][] = $row;
        }

        $build = function ($parentId) use (&$build, $byParent) {
            $nodes = [];
            foreach ($byParent[$parentId] ?? [] as $row) {
                $row->children = $build($row->id);
                $nodes[] = $row;
            }

            return $nodes;
        };

        return $build(0);
    }
}
