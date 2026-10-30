<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'sucursal_id', 'variante_origen_id', 'variante_destino_id', 'cantidad_origen', 'cantidad_destino', 'usuario_id', 'notas'])]
class TransformacionProducto extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'transformaciones_producto';

    protected function casts(): array
    {
        return ['cantidad_origen' => 'decimal:2', 'cantidad_destino' => 'decimal:2'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function varianteOrigen(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_origen_id');
    }

    public function varianteDestino(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_destino_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
