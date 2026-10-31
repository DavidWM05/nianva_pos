<?php

namespace App\Modules\CuentasPagar\Models;

use App\Modules\CuentasPagar\Database\Factories\AbonoPagarFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'cuenta_pagar_id', 'caja_sesion_id', 'usuario_id',
    'monto', 'metodo_pago_id', 'referencia',
])]
class AbonoPagar extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<AbonoPagarFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'abonos_pagar';

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha' => 'datetime',
    ];

    public static function tenantRelacion(): string
    {
        return 'cuentaPagar';
    }

    public function cuentaPagar(): BelongsTo
    {
        return $this->belongsTo(CuentaPagar::class);
    }

    public function cajaSesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function metodoPago(): BelongsTo
    {
        return $this->belongsTo(MetodoPago::class);
    }
}
