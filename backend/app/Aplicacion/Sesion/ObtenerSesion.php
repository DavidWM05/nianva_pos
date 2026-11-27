<?php

declare(strict_types=1);

namespace App\Aplicacion\Sesion;

use App\Aplicacion\Planes\CuotasPlan;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Dtos\SesionDto;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\Planes;
use Illuminate\Contracts\Session\Session;

/**
 * Caso de uso de lectura de GET /sesion (API-09): todo lo que el frontend necesita para
 * armar el menu, los guards y los formatos, en una sola respuesta. Cruza Nucleo con
 * Configuracion (ARQ-03). Solo lectura: no abre transaccion.
 *
 * - terminal: seleccionada para esta sesión y limitada a la sucursal del usuario (SEG-12).
 * - perfil_giro: aun no existe; se define con los planes (Fase 7).
 * - modulos_activos: los mismos que aplica el middleware `modulo:` (ModuloActivo::activos).
 * - locale: el tenant no lo guarda; se deriva del pais (MX -> es-MX).
 */
class ObtenerSesion
{
    private const MONEDA_POR_DEFECTO = '$';

    private const ZONA_HORARIA_POR_DEFECTO = 'America/Mexico_City';

    public function __construct(
        private readonly TerminalDeSesion $terminalDeSesion,
        private readonly Planes $planes,
        private readonly CuotasPlan $cuotas,
    ) {}

    public function ejecutar(Usuario $usuario, ?Session $sesion = null): SesionDto
    {
        $usuario->loadMissing(['roles', 'sucursal', 'tenant']);
        $configuracion = ConfiguracionTenant::actual();
        $sucursal = $usuario->sucursal;
        $terminal = $this->terminalDeSesion->actual($usuario, $sesion);

        $tenantId = $usuario->tenant?->id;

        return new SesionDto(
            usuario: $usuario,
            terminal: $terminal === null ? null : ['id' => $terminal->id, 'nombre' => $terminal->nombre, 'sucursal_id' => $terminal->sucursal_id],
            sucursal: $sucursal === null ? null : ['id' => $sucursal->id, 'nombre' => $sucursal->nombre],
            permisos: $usuario->nombresPermisos(),
            modulosActivos: ModuloActivo::activos(),
            plan: $tenantId === null ? null : $this->planes->deTenant($tenantId)->paraSesion(),
            limites: $tenantId === null ? null : $this->cuotas->estado($tenantId),
            regional: [
                'locale' => 'es-'.strtoupper($usuario->tenant->pais ?? 'MX'),
                'moneda' => $configuracion->moneda ?? self::MONEDA_POR_DEFECTO,
                'zona_horaria' => $configuracion->zona_horaria ?? self::ZONA_HORARIA_POR_DEFECTO,
            ],
        );
    }
}
