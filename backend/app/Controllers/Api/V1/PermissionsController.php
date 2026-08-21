<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\PermissionModel;

/**
 * Read-only: the permission catalog is fixed by the application, not
 * user-editable through the API.
 */
class PermissionsController extends BaseApiController
{
    public function index()
    {
        $result = $this->listResource(
            model(PermissionModel::class),
            [],
            ['id', 'name', 'slug'],
            ['name', 'slug', 'description'],
            'slug'
        );

        return $this->ok($result['data'], '', $result['meta']);
    }

    public function show($id = null)
    {
        $permission = model(PermissionModel::class)->find($id);

        if (! $permission) {
            return $this->notFound();
        }

        return $this->ok($permission);
    }
}
