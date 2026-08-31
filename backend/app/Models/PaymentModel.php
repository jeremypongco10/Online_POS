<?php

namespace App\Models;

use CodeIgniter\Model;

class PaymentModel extends Model
{
    /**
     * The one payment method code the app itself depends on rather than
     * just displaying — CashSessionsController's drawer reconciliation
     * sums payments WHERE method = self::METHOD_CASH. Every other code
     * is fully admin-defined now (see PaymentMethodModel /
     * PaymentMethodsController) — SalesController validates a payment's
     * method dynamically against the caller's company's active payment
     * methods rather than a fixed list.
     */
    public const METHOD_CASH = 'cash';

    protected $table = 'payments';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $allowedFields = [
        'sale_id', 'method', 'amount', 'reference', 'paid_at',
    ];

    protected $validationRules = [
        'sale_id' => ['label' => 'Sale', 'rules' => 'required|is_natural_no_zero'],
        // Dynamic per-company validity (is this code one of the caller's
        // active payment methods?) happens in SalesController, not here —
        // this model has no company context to check against.
        'method' => ['label' => 'Payment method', 'rules' => 'required|max_length[60]'],
        'amount' => ['label' => 'Amount', 'rules' => 'required|decimal'],
        'paid_at' => ['label' => 'Payment date/time', 'rules' => 'required'],
    ];
}
