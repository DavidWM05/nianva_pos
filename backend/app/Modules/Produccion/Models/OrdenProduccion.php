<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Produccion\Database\Factories\OrdenProduccionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'sucursal_id', 'receta_id', 'usuario_id', 'cantidad_programada', 'cantidad_producida', 'estado', 'notas', 'fecha_programada', 'fecha_completada'])]
class OrdenProduccion extends Model
{
    use BelongsToSucursal;
    use BelongsToTenant;

    /** @use HasFactory<OrdenProduccionFactory> */
    use HasFactory;

    protected $table = 'ordenes_produccion';

    protected function casts(): array
    {
        return ['cantidad_programada' => 'integer', 'cantidad_producida' => 'integer', 'fecha_programada' => 'date', 'fecha_completada' => 'datetime'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function receta(): BelongsTo
    {
        return $this->belongsTo(Receta::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
