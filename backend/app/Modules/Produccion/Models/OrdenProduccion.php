<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['tenant_id', 'sucursal_id', 'receta_id', 'usuario_id', 'cantidad_programada', 'cantidad_producida', 'estado', 'notas', 'fecha_programada', 'fecha_completada'])]
class OrdenProduccion extends Model
{
    use BelongsToTenant;
    protected $table = 'ordenes_produccion';
    protected function casts(): array { return ['cantidad_programada' => 'integer', 'cantidad_producida' => 'integer', 'fecha_programada' => 'date', 'fecha_completada' => 'datetime']; }
    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function sucursal(): BelongsTo { return $this->belongsTo(Sucursal::class); }
    public function receta(): BelongsTo { return $this->belongsTo(Receta::class); }
    public function usuario(): BelongsTo { return $this->belongsTo(Usuario::class); }
}
