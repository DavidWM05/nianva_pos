<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['receta_id', 'insumo_id', 'cantidad', 'unidad_medida_id'])]
class RecetaIngrediente extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'receta_ingredientes';

    protected function casts(): array
    {
        return ['cantidad' => 'decimal:4'];
    }

    public static function tenantRelacion(): string
    {
        return 'receta';
    }

    public function receta(): BelongsTo
    {
        return $this->belongsTo(Receta::class);
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class);
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class);
    }
}
