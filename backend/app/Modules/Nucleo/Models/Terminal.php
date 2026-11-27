<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\TerminalFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $sucursal_id
 * @property string $nombre
 * @property bool $activo
 */
#[Fillable(['tenant_id', 'sucursal_id', 'nombre', 'activo'])]
final class Terminal extends Model
{
    use BelongsToSucursal, BelongsToTenant;

    /** @use HasFactory<TerminalFactory> */
    use HasFactory;

    protected $table = 'terminales';

    protected $attributes = ['activo' => true];

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public function resolveRouteBinding($value, $field = null): ?self
    {
        $usuario = Auth::user();
        if (! $usuario instanceof Usuario || $usuario->esSuperadmin()) {
            return null;
        }

        // El binding puede ejecutarse antes de que ResolveTenant configure el scope.
        return self::query()->where('tenant_id', $usuario->getAttribute('tenant_id'))->whereKey($value)->first();
    }
}
