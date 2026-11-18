<?php

namespace App\Modules\Tpv\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Casts\CantidadDecimal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Tpv\Database\Factories\VentaDetalleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando venta.tenant_id (ver tenantRelacion()).
 *
 * DAT-03: foto de la línea al momento de la operación.
 *
 * @property string $precio_unitario
 * @property string $descuento_aplicado
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
#[Fillable(['presentacion_id', 'presentacion_nombre', 'venta_id', 'variante_id', 'cantidad', 'precio_unitario', 'descuento_aplicado', 'lista_precio_id', 'lista_precio_nombre', 'regla_precio_id', 'regla_nombre', 'costo_unitario', 'tasa_impuesto', 'exento', 'impuesto', 'unidad_medida_id', 'factor', 'subtotal'])]
class VentaDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<VentaDetalleFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'venta_detalles';

    protected $attributes = ['presentacion_id' => null, 'presentacion_nombre' => null];

    protected function casts(): array
    {
        return ['cantidad' => CantidadDecimal::class,
            'precio_unitario' => 'decimal:2',
            'descuento_aplicado' => 'decimal:2',
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
        return 'venta';
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }

    /**
     * DAT-03: las reglas combinadas de la línea, con su nombre y descuento copiados.
     *
     * @return HasMany<VentaLineaRegla, $this>
     */
    public function reglas(): HasMany
    {
        return $this->hasMany(VentaLineaRegla::class, 'venta_detalle_id');
    }

    public function reglaPrecio(): BelongsTo
    {
        return $this->belongsTo(ReglaPrecio::class, 'regla_precio_id');
    }
}
