<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\KardexFactory;
use App\Modules\Nucleo\Casts\CantidadDecimal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\EsLibroDeMovimientos;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DAT-04: libro de stock de solo inserción. Cada renglón guarda el saldo antes y después;
 * inventario_stock.stock_actual es su proyección y se actualiza en la misma transacción. El primer
 * movimiento de cada variante en una sucursal es saldo_inicial (DAT-05). Sin tenant_id propio:
 * aislamiento via BelongsToTenantViaRelacion consultando sucursal.tenant_id.
 *
 * Solo se escribe desde InventarioService (registrarMovimientoConStock() y el saldo inicial);
 * actualizar o borrar un renglón lanza una excepción (EsLibroDeMovimientos).
 *
 * @property int|float $stock_antes
 * @property int|float $stock_despues
 */
#[Fillable([
    'variante_id', 'sucursal_id', 'tipo', 'cantidad', 'motivo',
    'referencia_tabla', 'referencia_id', 'stock_antes', 'stock_despues', 'usuario_id',
])]
class Kardex extends Model
{
    use BelongsToTenantViaRelacion;
    use EsLibroDeMovimientos;

    /** @use HasFactory<KardexFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'kardex';

    protected function casts(): array
    {
        return ['cantidad' => CantidadDecimal::class, 'stock_antes' => CantidadDecimal::class, 'stock_despues' => CantidadDecimal::class, 'fecha' => 'datetime'];
    }

    public static function tenantRelacion(): string
    {
        return 'sucursal';
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
