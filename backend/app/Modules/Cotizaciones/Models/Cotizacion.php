<?php

namespace App\Modules\Cotizaciones\Models;

use App\Modules\Cotizaciones\Database\Factories\CotizacionFactory;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'sucursal_id', 'cliente_id', 'usuario_id', 'numero_cotizacion',
    'total', 'descuento', 'validez_dias', 'estado', 'venta_id',
    'observaciones', 'fecha_vencimiento', 'uso_cfdi',
])]
class Cotizacion extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<CotizacionFactory> */
    use HasFactory;

    protected $table = 'cotizaciones';

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'descuento' => 'decimal:2',
            'validez_dias' => 'integer',
            'fecha_vencimiento' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
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

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(CotizacionDetalle::class);
    }
}
