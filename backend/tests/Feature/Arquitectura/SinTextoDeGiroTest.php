<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * ARQ-07: el giro es configuracion, no codigo. Ningun texto de un giro (talla, color, ropa,
 * zapateria) en el codigo de app/ ni en sus mensajes: los atributos y sus valores son datos del
 * tenant. Quedan fuera los perfiles de giro (app/Modules/Configuracion/PerfilesGiro), que son
 * justamente esos datos, y los comentarios (por ejemplo, el nombre del sistema anterior).
 */
class SinTextoDeGiroTest extends TestCase
{
    private const PATRON = '/\b(talla|color|ropa|zapater[ií]a)\b/iu';

    private const FUERA = ['app/Modules/Configuracion/PerfilesGiro/'];

    /** Solo baja: archivos de app/ que todavia tienen texto de giro. */
    private const PENDIENTES = [];

    public function test_el_codigo_no_tiene_texto_de_giro(): void
    {
        $infracciones = [];

        foreach (File::allFiles(base_path('app')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            $ruta = str_replace('\\', '/', substr($archivo->getPathname(), strlen(base_path()) + 1));
            if ($this->fuera($ruta) || in_array($ruta, self::PENDIENTES, true)) {
                continue;
            }

            foreach ($this->textoDeGiro(File::get($archivo->getPathname())) as [$linea, $texto]) {
                $infracciones[] = "{$ruta}:{$linea}: {$texto}";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_los_pendientes_existen_y_todavia_tienen_texto_de_giro(): void
    {
        $this->assertSame(array_values(array_unique(self::PENDIENTES)), self::PENDIENTES, 'PENDIENTES tiene duplicados.');

        foreach (self::PENDIENTES as $ruta) {
            $this->assertFileExists(base_path($ruta));
            $this->assertNotSame([], $this->textoDeGiro(File::get(base_path($ruta))), "{$ruta}: ya no tiene texto de giro; quitalo de PENDIENTES.");
        }
    }

    /**
     * Busca en los tokens de PHP que no son comentarios: codigo, cadenas y HTML en linea.
     *
     * @return list<array{0: int, 1: string}>
     */
    private function textoDeGiro(string $codigo): array
    {
        $hallazgos = [];

        foreach (token_get_all($codigo) as $token) {
            if (! is_array($token) || in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }

            if (preg_match(self::PATRON, $token[1], $coincidencia) === 1) {
                $hallazgos[] = [$token[2], $coincidencia[0]];
            }
        }

        return $hallazgos;
    }

    private function fuera(string $ruta): bool
    {
        foreach (self::FUERA as $prefijo) {
            if (str_starts_with($ruta, $prefijo)) {
                return true;
            }
        }

        return false;
    }
}
