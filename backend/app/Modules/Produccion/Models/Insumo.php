<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Produccion\Database\Factories\InsumoFactory;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'nombre', 'sku', 'unidad_medida_id', 'costo', 'stock_minimo', 'activo'])]
class Insumo extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<InsumoFactory> */
    use HasFactory;

    protected $table = 'insumos';

    protected function casts(): array
    {
        return ['costo' => 'decimal:4', 'stock_minimo' => 'decimal:2', 'activo' => 'boolean'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unidadMedida(): BelongsTo
    {
        return $this->belongsTo(UnidadMedida::class);
    }
}
