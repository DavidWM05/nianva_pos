<?php

declare(strict_types=1);

namespace App\Aplicacion\Sesion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Dtos\SesionDto;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Models\Usuario;

/**
 * Caso de uso de lectura de GET /sesion (API-09): todo lo que el frontend necesita para
 * armar el menu, los guards y los formatos, en una sola respuesta. Cruza Nucleo con
 * Configuracion (ARQ-03). Solo lectura: no abre transaccion.
 *
 * - terminal: aun no existe el concepto; llega con el PIN de caja (SEG-12, Fase 4).
 * - perfil_giro: aun no existe; se define con los planes (Fase 7).
 * - modulos_activos: los mismos que aplica el middleware `modulo:` (ModuloActivo::activos).
 * - locale: el tenant no lo guarda; se deriva del pais (MX -> es-MX).
 */
class ObtenerSesion
{
    private const MONEDA_POR_DEFECTO = '$';

    private const ZONA_HORARIA_POR_DEFECTO = 'America/Mexico_City';

    public function ejecutar(Usuario $usuario): SesionDto
    {
        $usuario->loadMissing(['roles', 'sucursal', 'tenant']);
        $configuracion = ConfiguracionTenant::actual();
        $sucursal = $usuario->sucursal;

        return new SesionDto(
            usuario: $usuario,
            sucursal: $sucursal === null ? null : ['id' => $sucursal->id, 'nombre' => $sucursal->nombre],
            permisos: $usuario->nombresPermisos(),
            modulosActivos: ModuloActivo::activos(),
            regional: [
                'locale' => 'es-'.strtoupper($usuario->tenant->pais ?? 'MX'),
                'moneda' => $configuracion->moneda ?? self::MONEDA_POR_DEFECTO,
                'zona_horaria' => $configuracion->zona_horaria ?? self::ZONA_HORARIA_POR_DEFECTO,
            ],
        );
    }
}
