<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\RutaPorUlid;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Database\Factories\CajaSesionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando sucursal.tenant_id (ver tenantRelacion()).
 */
#[Fillable([
    'sucursal_id', 'usuario_id', 'monto_apertura', 'saldo_teorico', 'monto_cierre',
    'total_ventas_sistema', 'total_teorico', 'diferencia', 'fecha_apertura', 'fecha_cierre', 'estado',
])]
class CajaSesion extends Model
{
    use BelongsToSucursal;
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CajaSesionFactory> */
    use HasFactory;

    use RutaPorUlid;
    use TieneUlid;

    public $timestamps = false;

    protected $table = 'caja_sesiones';

    protected function casts(): array
    {
        return [
            'monto_apertura' => 'decimal:2',
            'saldo_teorico' => 'decimal:2',
            'monto_cierre' => 'decimal:2',
            'total_ventas_sistema' => 'decimal:2',
            'diferencia' => 'decimal:2',
            'total_teorico' => 'decimal:2',
            'fecha_apertura' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    /**
     * DAT-04: la proyección del libro de caja nace igual al monto de apertura (el saldo inicial),
     * también en una caja creada sin CajaService, como en una preparación de pruebas.
     */
    protected static function booted(): void
    {
        static::creating(static function (self $caja): void {
            if ($caja->getAttribute('saldo_teorico') === null) {
                $caja->setAttribute('saldo_teorico', $caja->getAttribute('monto_apertura'));
            }
        });
    }

    public static function tenantRelacion(): string
    {
        return 'sucursal';
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class);
    }

    /** @return HasMany<CajaSesionSaldo, $this> */
    public function saldos(): HasMany
    {
        return $this->hasMany(CajaSesionSaldo::class);
    }

    /** @return HasMany<CajaCierreMetodo, $this> */
    public function cierreMetodos(): HasMany
    {
        return $this->hasMany(CajaCierreMetodo::class);
    }

    /** @return HasMany<CajaMovimiento, $this> */
    public function movimientos(): HasMany
    {
        return $this->hasMany(CajaMovimiento::class);
    }
}
