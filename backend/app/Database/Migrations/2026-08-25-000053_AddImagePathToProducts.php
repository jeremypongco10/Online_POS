<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Stores the path (relative to public/, e.g. "uploads/products/12_ab3f.jpg")
 * of a product's photo, not the image itself — ProductsController writes
 * the file straight into public/uploads/products/ so it's reachable by a
 * plain <img> tag with no auth header. Null means no image uploaded yet.
 */
class AddImagePathToProducts extends Migration
{
    public function up()
    {
        $this->forge->addColumn('products', [
            'image_path' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
                'after' => 'description',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('products', ['image_path']);
    }
}
