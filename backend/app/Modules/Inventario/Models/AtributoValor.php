<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\AtributoValorFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

/**
 * ARQ-07: valor posible de un atributo. Conserva BelongsToTenantViaRelacion para las consultas
 * (el scope se resuelve por atributo.tenant_id); tenant_id se copia del atributo al crear el valor,
 * como en ProductoVariante.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $atributo_id
 * @property string $valor
 * @property int $orden
 */
#[Fillable(['tenant_id', 'atributo_id', 'valor', 'orden'])]
class AtributoValor extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<AtributoValorFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'atributo_valores';

    protected function casts(): array
    {
        return ['orden' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $valor): void {
            $atributo = Atributo::sinTenant()->whereKey($valor->atributo_id)->first();

            if ($atributo === null) {
                throw new InvalidArgumentException("El atributo {$valor->atributo_id} no existe.");
            }

            if ($valor->getAttribute('tenant_id') === null) {
                $valor->setAttribute('tenant_id', $atributo->tenant_id);

                return;
            }

            if ((int) $valor->getAttribute('tenant_id') !== (int) $atributo->tenant_id) {
                throw new InvalidArgumentException("El valor y el atributo {$atributo->id} pertenecen a tenants distintos.");
            }
        });
    }

    public static function tenantRelacion(): string
    {
        return 'atributo';
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<AtributoValor>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    /** @return BelongsTo<Atributo, $this> */
    public function atributo(): BelongsTo
    {
        return $this->belongsTo(Atributo::class);
    }
}
