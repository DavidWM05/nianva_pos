<?php

namespace App\Modules\NotasCredito\Models;

use App\Modules\NotasCredito\Database\Factories\NotaCreditoUsoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\EsLibroDeMovimientos;
use App\Modules\Nucleo\Models\Concerns\SerializaDecimales;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $venta_id
 * @property string $monto_usado
 * @property string $created_at
 */
#[Fillable(['nota_credito_id', 'tipo', 'venta_id', 'monto_usado', 'saldo_antes', 'saldo_despues', 'usuario_id'])]
class NotaCreditoUso extends Model
{
    use BelongsToTenantViaRelacion;
    use EsLibroDeMovimientos;

    /** @use HasFactory<NotaCreditoUsoFactory> */
    use HasFactory;

    use SerializaDecimales;
    use TieneUlid;

    const UPDATED_AT = null;

    public $timestamps = false;

    protected $table = 'nota_credito_usos';

    protected $casts = [
        'monto_usado' => 'decimal:2',
        'saldo_antes' => 'decimal:2',
        'saldo_despues' => 'decimal:2',
    ];

    public static function tenantRelacion(): string
    {
        return 'notaCredito';
    }

    public function notaCredito(): BelongsTo
    {
        return $this->belongsTo(NotaCredito::class);
    }

    /** @return BelongsTo<Venta, $this> */
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }
}
