<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\KardexFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Fotografia historica de cada movimiento de stock -- nunca se lee como
 * fuente de verdad (esa es inventario_stock), solo se escribe. Sin
 * tenant_id propio: aislamiento via BelongsToTenantViaRelacion consultando
 * sucursal.tenant_id.
 *
 * Solo se escribe desde InventarioService::registrarMovimiento().
 */
#[Fillable([
    'variante_id', 'sucursal_id', 'tipo', 'cantidad', 'motivo',
    'referencia_tabla', 'referencia_id', 'stock_resultante', 'usuario_id',
])]
class Kardex extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<KardexFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'kardex';

    protected function casts(): array
    {
        return ['fecha' => 'datetime'];
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
