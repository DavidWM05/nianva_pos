<?php

namespace App\Modules\CuentasCobrar\Models;

use App\Modules\CuentasCobrar\Database\Factories\AbonoCuentaFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'cuenta_cobrar_id', 'caja_sesion_id', 'usuario_id',
    'monto', 'metodo_pago_id', 'referencia',
])]
class AbonoCuenta extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<AbonoCuentaFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'abonos_cuenta';

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha' => 'datetime',
    ];

    public static function tenantRelacion(): string
    {
        return 'cuentaCobrar';
    }

    public function cuentaCobrar(): BelongsTo
    {
        return $this->belongsTo(CuentaCobrar::class);
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
