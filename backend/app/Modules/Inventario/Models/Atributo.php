<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\AtributoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * ARQ-07: atributo generico de variante. Su nombre lo da el tenant o su perfil de giro.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nombre
 * @property int $orden
 */
#[Fillable(['tenant_id', 'nombre', 'orden'])]
class Atributo extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<AtributoFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'atributos';

    protected function casts(): array
    {
        return ['orden' => 'integer'];
    }

    /**
     * Como el de BelongsToTenant, con el tipo del modelo.
     *
     * @return Builder<Atributo>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScope::class);
    }

    /** @return HasMany<AtributoValor, $this> */
    public function valores(): HasMany
    {
        return $this->hasMany(AtributoValor::class)->orderBy('orden')->orderBy('id');
    }
}
