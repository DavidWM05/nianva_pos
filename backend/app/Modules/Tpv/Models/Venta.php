<?php

namespace App\Modules\Tpv\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'sucursal_id', 'caja_sesion_id', 'usuario_id', 'cliente_id', 'cupon_id',
    'total', 'descuento_cupon', 'descuento_manual', 'abono_previo', 'es_venta_sombra',
    'estado', 'motivo_anulacion', 'fecha_anulacion', 'usuario_anulacion_id',
])]
class Venta extends Model
{
    use BelongsToTenant;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'ventas';

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'descuento_cupon' => 'decimal:2',
            'descuento_manual' => 'decimal:2',
            'abono_previo' => 'decimal:2',
            'es_venta_sombra' => 'boolean',
            'fecha' => 'datetime',
            'fecha_anulacion' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function cajaSesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function cupon(): BelongsTo
    {
        return $this->belongsTo(Cupon::class);
    }

    public function usuarioAnulacion(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_anulacion_id');
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(VentaPago::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(VentaDetalle::class);
    }
}
