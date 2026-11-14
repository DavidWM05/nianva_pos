<?php

declare(strict_types=1);

namespace App\Aplicacion\Nucleo;

use App\Modules\Nucleo\Dtos\UsuarioDto;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\ReglasUltimoAdmin;
use Illuminate\Support\Facades\DB;

/**
 * Edicion de un usuario. Si los roles nuevos ya no incluyen admin, el usuario no puede ser el
 * ultimo admin activo del tenant (DAT-10).
 */
final class ActualizarUsuario
{
    public function ejecutar(Usuario $usuario, UsuarioDto $dto): Usuario
    {
        $operacion = function () use ($usuario, $dto): Usuario {
            $usuario = Usuario::query()->whereKey($usuario->getKey())->lockForUpdate()->firstOrFail();
            $roles = $dto->rolesParaSync();
            $datos = $dto->datosPresentes();

            // Contrasena opcional en edicion -- omitirla del array deja el
            // valor actual intacto (nunca se sobreescribe con null/vacio).
            if (empty($datos['password'])) {
                unset($datos['password']);
            }

            $rolesVisibles = $roles === null ? null : $this->rolesVisiblesDelTenant($roles);

            if ($rolesVisibles !== null && ! $this->incluyeAdmin($rolesVisibles)) {
                ReglasUltimoAdmin::exigirOtroAdmin($usuario, fn ($consulta) => $consulta->lockForUpdate());
            }

            $usuario->update($datos);
            if ($rolesVisibles !== null) {
                $usuario->roles()->sync($rolesVisibles);
            }

            return $usuario;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }

    /**
     * `roles.*` usa ReglasTenant::existeGlobalODelTenant(), que ya rechaza
     * roles de otro tenant. Este segundo filtro, pasando los ids por una
     * consulta Eloquent normal (con el scope activo), descarta cualquier id
     * que no pertenezca al tenant actual o al catalogo global (es_sistema).
     *
     * @param  list<int>  $rolesIds
     * @return list<int>
     */
    private function rolesVisiblesDelTenant(array $rolesIds): array
    {
        if ($rolesIds === []) {
            return [];
        }

        return array_values(array_map(fn ($id): int => (int) $id, Rol::whereIn('id', $rolesIds)->pluck('id')->all()));
    }

    /**
     * @param  list<int>  $rolesIds
     */
    private function incluyeAdmin(array $rolesIds): bool
    {
        return $rolesIds !== [] && Rol::whereIn('id', $rolesIds)->where('nombre', ReglasUltimoAdmin::ROL_ADMIN)->exists();
    }
}
