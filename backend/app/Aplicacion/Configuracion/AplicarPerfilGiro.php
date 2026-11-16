<?php

declare(strict_types=1);

namespace App\Aplicacion\Configuracion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Configuracion\Support\PerfilesGiro;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * ARQ-07: siembra en el tenant lo que define su perfil de giro y lo deja como su perfil. Crea
 * solo lo que falta, asi que aplicarlo dos veces no duplica: atributos por nombre, valores por
 * atributo y valor, categorias por nombre y unidades por abreviatura, contando tambien las
 * unidades globales (tenant_id null): si existe un `kg` global, no crea otro del tenant.
 * No crea presentaciones (van por variante) ni plantilla de etiqueta (aun no hay etiquetas).
 */
final class AplicarPerfilGiro
{
    /**
     * @return array{atributos: int, valores: int, categorias: int, unidades: int}
     */
    public function ejecutar(int $tenantId, string $clave): array
    {
        $perfil = PerfilesGiro::buscar($clave) ?? throw new InvalidArgumentException("Perfil de giro desconocido: {$clave}.");
        $creados = ['atributos' => 0, 'valores' => 0, 'categorias' => 0, 'unidades' => 0];

        DB::transaction(function () use ($tenantId, $perfil, &$creados): void {
            foreach ($perfil['atributos'] as $orden => $definicion) {
                $atributo = Atributo::sinTenant()->firstOrCreate(
                    ['tenant_id' => $tenantId, 'nombre' => $definicion['nombre']],
                    ['orden' => $orden],
                );
                $creados['atributos'] += $atributo->wasRecentlyCreated ? 1 : 0;

                foreach ($definicion['valores'] as $ordenValor => $valor) {
                    $fila = AtributoValor::sinTenant()->firstOrCreate(
                        ['atributo_id' => $atributo->getKey(), 'valor' => $valor],
                        ['orden' => $ordenValor],
                    );
                    $creados['valores'] += $fila->wasRecentlyCreated ? 1 : 0;
                }
            }

            foreach ($perfil['categorias'] as $nombre) {
                $categoria = Categoria::sinTenant()->firstOrCreate(
                    ['tenant_id' => $tenantId, 'nombre' => $nombre],
                    ['activo' => true],
                );
                $creados['categorias'] += $categoria->wasRecentlyCreated ? 1 : 0;
            }

            foreach ($perfil['unidades'] as $unidad) {
                $existe = UnidadMedida::sinTenant()
                    ->where('abreviatura', $unidad['abreviatura'])
                    ->where(fn ($q) => $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId))
                    ->exists();
                if (! $existe) {
                    UnidadMedida::sinTenant()->create([...$unidad, 'tenant_id' => $tenantId, 'activo' => true]);
                    $creados['unidades']++;
                }
            }

            ConfiguracionTenant::sinTenant()->updateOrCreate(
                ['tenant_id' => $tenantId],
                ['perfil_giro' => $perfil['clave']],
            );
        });

        return $creados;
    }
}
