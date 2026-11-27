<?php

declare(strict_types=1);

namespace App\Aplicacion\Sesion;

use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Contracts\Session\Session;
use Illuminate\Database\Eloquent\Collection;

final class TerminalDeSesion
{
    private const CLAVE = 'auth.terminal_id';

    public function elegir(Session $sesion, int $terminalId): void
    {
        $sesion->put(self::CLAVE, $terminalId);
    }

    public function actual(Usuario $usuario, ?Session $sesion): ?Terminal
    {
        $terminalId = $sesion?->get(self::CLAVE);

        return is_int($terminalId) ? $this->buscar($usuario, $terminalId) : null;
    }

    /** @return Collection<int, Terminal> */
    public function disponibles(Usuario $usuario): Collection
    {
        return Terminal::query()->where('activo', true)
            ->where('tenant_id', $usuario->getAttribute('tenant_id'))
            ->where('sucursal_id', $usuario->getAttribute('sucursal_id'))
            ->orderBy('nombre')->get();
    }

    private function buscar(Usuario $usuario, int $terminalId): ?Terminal
    {
        return Terminal::query()->where('activo', true)
            ->where('tenant_id', $usuario->getAttribute('tenant_id'))
            ->where('sucursal_id', $usuario->getAttribute('sucursal_id'))
            ->find($terminalId);
    }
}
