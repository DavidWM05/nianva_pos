<?php

namespace App\Modules\Devoluciones\Models;

use App\Modules\Devoluciones\Database\Factories\DevolucionItemFactory;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Casts\CantidadDecimal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando devolucion.tenant_id (ver tenantRelacion()). tipo='devuelto'
 * o 'nuevo' distingue las lineas que regresan de las que se entregan en un
 * cambio -- ambas viven en la misma tabla porque ambas describen la misma
 * transaccion de devolucion/cambio.
 *
 * DAT-03: foto de la línea al momento de la operación.
 *
 * @property string $precio_unitario
 * @property string $descuento
 * @property int|null $lista_precio_id
 * @property string|null $lista_precio_nombre
 * @property int|null $regla_precio_id
 * @property string|null $regla_nombre
 * @property string $costo_unitario
 * @property string $tasa_impuesto
 * @property bool $exento
 * @property string $impuesto
 * @property int $unidad_medida_id
 * @property string $factor
 */
#[Fillable(['devolucion_id', 'variante_id', 'tipo', 'cantidad', 'precio_unitario', 'descuento', 'lista_precio_id', 'lista_precio_nombre', 'regla_precio_id', 'regla_nombre', 'costo_unitario', 'tasa_impuesto', 'exento', 'impuesto', 'unidad_medida_id', 'factor', 'subtotal', 'va_a_merma'])]
class DevolucionItem extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<DevolucionItemFactory> */
    use HasFactory;

    use TieneUlid;

    public $timestamps = false;

    protected $table = 'devolucion_items';

    protected function casts(): array
    {
        return ['cantidad' => CantidadDecimal::class,
            'precio_unitario' => 'decimal:2',
            'descuento' => 'decimal:2',
            'costo_unitario' => 'decimal:2',
            'tasa_impuesto' => 'decimal:4',
            'exento' => 'boolean',
            'impuesto' => 'decimal:2',
            'factor' => 'decimal:3',
            'subtotal' => 'decimal:2',
            'va_a_merma' => 'boolean',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'devolucion';
    }

    public function devolucion(): BelongsTo
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }

    /**
     * DAT-03: las reglas combinadas de la línea, con su nombre y descuento copiados.
     *
     * @return HasMany<DevolucionLineaRegla, $this>
     */
    public function reglas(): HasMany
    {
        return $this->hasMany(DevolucionLineaRegla::class, 'devolucion_item_id');
    }
}
