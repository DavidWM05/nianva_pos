<?php

namespace App\Modules\Cotizaciones\Models;

use App\Modules\Cotizaciones\Database\Factories\CotizacionDetalleFactory;
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
#[Fillable(['cotizacion_id', 'variante_id', 'cantidad', 'precio_unitario', 'descuento', 'lista_precio_id', 'lista_precio_nombre', 'regla_precio_id', 'regla_nombre', 'costo_unitario', 'tasa_impuesto', 'exento', 'impuesto', 'unidad_medida_id', 'factor', 'subtotal'])]
class CotizacionDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CotizacionDetalleFactory> */
    use HasFactory;

    use TieneUlid;

    public $timestamps = false;

    protected $table = 'cotizacion_detalles';

    protected function casts(): array
    {
        return [
            'cantidad' => CantidadDecimal::class,
            'precio_unitario' => 'decimal:2',
            'descuento' => 'decimal:2',
            'costo_unitario' => 'decimal:2',
            'tasa_impuesto' => 'decimal:4',
            'exento' => 'boolean',
            'impuesto' => 'decimal:2',
            'factor' => 'decimal:3',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'cotizacion';
    }

    public function cotizacion(): BelongsTo
    {
        return $this->belongsTo(Cotizacion::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }

    /**
     * DAT-03: las reglas combinadas de la línea, con su nombre y descuento copiados.
     *
     * @return HasMany<CotizacionLineaRegla, $this>
     */
    public function reglas(): HasMany
    {
        return $this->hasMany(CotizacionLineaRegla::class, 'cotizacion_detalle_id');
    }
}
