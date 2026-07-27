<?php

namespace App\Modules\Gastos\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio y a DOS saltos de la fila que si lo tiene:
 * caja_sesion tampoco tiene tenant_id propio (hereda de sucursal).
 * tenantRelacion() usa notacion de puntos 'cajaSesion.sucursal' -- mismo
 * patron ya usado en ApartadoAbonoPago (Apartados) para 'abono.apartado'.
 */
#[Fillable(['caja_sesion_id', 'sucursal_id', 'usuario_id', 'descripcion', 'monto'])]
class Gasto extends Model
{
    use BelongsToTenantViaRelacion;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'gastos';

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'cajaSesion.sucursal';
    }

    public function cajaSesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
