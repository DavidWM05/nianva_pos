<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class TransaccionesEnActionsTest extends TestCase
{
    /** @var array<string, int> Deuda inicial: solo se reduce al migrar cada caso de uso. */
    private const PENDIENTES = [
        'Modules/Apartados/Services/ApartadoService.php' => 2,
        'Modules/Cotizaciones/Services/CotizacionService.php' => 5,
        'Modules/Inventario/Services/InventarioService.php' => 3,
        'Modules/Nucleo/Console/Commands/ResetearDosFactorCommand.php' => 1,
        'Modules/Produccion/Services/ProduccionService.php' => 4,
        'Modules/Tpv/Services/CajaService.php' => 2,
        'Modules/Tpv/Services/VentaService.php' => 2,
        'Modules/UnidadesMedida/Services/UnidadMedidaService.php' => 3,
    ];

    /** @var array<string, string> Lista cerrada por ARQ-10; no se agregan módulos. */
    private const EXENTOS = [
        'CrmAvanzado' => 'módulo congelado (cambio mínimo)',
        'Delivery' => 'módulo congelado (cambio mínimo)',
        'Payroll' => 'módulo congelado (cambio mínimo)',
        'Prestamos' => 'módulo congelado (cambio mínimo)',
    ];

    public function test_transacciones_y_bloqueos_solo_en_actions(): void
    {
        $infracciones = [];
        foreach (File::allFiles(app_path()) as $archivo) {
            $ruta = str_replace('\\', '/', substr($archivo->getPathname(), strlen(app_path()) + 1));
            if ($archivo->getExtension() !== 'php' || str_starts_with($ruta, 'Aplicacion/')) {
                continue;
            }
            if (preg_match('~^Modules/([^/]+)/~', $ruta, $modulo) && isset(self::EXENTOS[$modulo[1]])) {
                continue;
            }
            // No se cuentan ejemplos de los comentarios ni textos de mensajes.
            $codigo = '';
            foreach (token_get_all(File::get($archivo->getPathname())) as $token) {
                $codigo .= is_array($token)
                    ? (in_array($token[0], [T_COMMENT, T_DOC_COMMENT, T_CONSTANT_ENCAPSED_STRING], true) ? ' ' : $token[1])
                    : $token;
            }
            $usos = preg_match_all('/\bDB\s*::\s*(?:transaction|beginTransaction)\s*\(|->\s*(?:lockForUpdate|sharedLock)\s*\(/', $codigo);
            $esperados = self::PENDIENTES[$ruta] ?? 0;
            if ($usos !== $esperados) {
                $infracciones[] = "{$ruta}: {$usos} usos, PENDIENTES permite {$esperados}; migra a una Action o registra la bajada.";
            }
        }
        foreach (self::PENDIENTES as $ruta => $usos) {
            if (! is_file(app_path($ruta))) {
                $infracciones[] = "{$ruta}: PENDIENTES apunta a un archivo inexistente.";
            }
        }
        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
