<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Database\Factories\CajaSesionSaldoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['caja_sesion_id', 'metodo_pago_id', 'saldo_teorico'])]
class CajaSesionSaldo extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CajaSesionSaldoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'caja_sesion_saldos';

    protected function casts(): array
    {
        return ['saldo_teorico' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'caja.sucursal';
    }

    /** @return BelongsTo<CajaSesion, $this> */
    public function caja(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class, 'caja_sesion_id');
    }

    /** @return BelongsTo<MetodoPago, $this> */
    public function metodoPago(): BelongsTo
    {
        return $this->belongsTo(MetodoPago::class);
    }

    /** @return Builder<CajaSesionSaldo> */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }
}
