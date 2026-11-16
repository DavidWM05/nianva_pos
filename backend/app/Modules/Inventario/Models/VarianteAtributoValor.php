<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\VarianteAtributoValorFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ARQ-07: el valor que una variante tiene en un atributo (a lo mas uno por atributo).
 *
 * @property int $id
 * @property int $variante_id
 * @property int $atributo_id
 * @property int $atributo_valor_id
 */
#[Fillable(['variante_id', 'atributo_id', 'atributo_valor_id'])]
class VarianteAtributoValor extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<VarianteAtributoValorFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'variante_atributo_valores';

    public static function tenantRelacion(): string
    {
        return 'variante';
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<VarianteAtributoValor>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    /** @return BelongsTo<ProductoVariante, $this> */
    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }

    /** @return BelongsTo<Atributo, $this> */
    public function atributo(): BelongsTo
    {
        return $this->belongsTo(Atributo::class);
    }

    /** @return BelongsTo<AtributoValor, $this> */
    public function valor(): BelongsTo
    {
        return $this->belongsTo(AtributoValor::class, 'atributo_valor_id');
    }
}
