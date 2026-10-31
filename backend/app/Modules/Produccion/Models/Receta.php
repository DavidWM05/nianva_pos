<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Produccion\Database\Factories\RecetaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'variante_id', 'nombre', 'descripcion', 'instrucciones', 'rendimiento'])]
class Receta extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<RecetaFactory> */
    use HasFactory;

    protected $table = 'recetas';

    protected function casts(): array
    {
        return ['rendimiento' => 'decimal:2'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }

    public function ingredientes(): HasMany
    {
        return $this->hasMany(RecetaIngrediente::class);
    }
}
