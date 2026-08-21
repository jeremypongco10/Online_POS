<?php

namespace App\Models;

use CodeIgniter\Model;

class PaymentModel extends Model
{
    public const METHOD_CASH = 'cash';
    public const METHOD_CARD = 'card';
    public const METHOD_GCASH = 'gcash';
    public const METHOD_MAYA = 'maya';
    public const METHOD_BANK_TRANSFER = 'bank_transfer';
    public const METHOD_OTHER = 'other';

    public const METHODS = [
        self::METHOD_CASH,
        self::METHOD_CARD,
        self::METHOD_GCASH,
        self::METHOD_MAYA,
        self::METHOD_BANK_TRANSFER,
        self::METHOD_OTHER,
    ];

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
        'sale_id' => 'required|is_natural_no_zero',
        'method' => 'required|in_list[cash,card,gcash,maya,bank_transfer,other]',
        'amount' => 'required|decimal',
        'paid_at' => 'required',
    ];
}
