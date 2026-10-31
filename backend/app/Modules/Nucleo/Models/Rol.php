<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\RolFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['tenant_id', 'nombre', 'descripcion', 'es_sistema'])]
class Rol extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<RolFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'roles';

    protected function casts(): array
    {
        return [
            'es_sistema' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function permisos(): BelongsToMany
    {
        return $this->belongsToMany(Permiso::class, 'rol_permisos')
            ->using(RolPermiso::class)
            ->withPivot('created_at');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(Usuario::class, 'usuario_roles')
            ->using(UsuarioRol::class)
            ->withPivot(['sucursal_id', 'created_at']);
    }
}
