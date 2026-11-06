<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ComentariosAntesDeReturnTest extends TestCase
{
    public function test_los_comentarios_no_se_convierten_en_descripciones_openapi(): void
    {
        $infracciones = [];
        foreach (File::allFiles(app_path()) as $archivo) {
            $ruta = str_replace('\\', '/', $archivo->getPathname());
            if ($archivo->getExtension() !== 'php' || ! preg_match('~/Aplicacion/|/Http/Controllers/|/Services/~', $ruta) || preg_match('~/Modules/(CrmAvanzado|Delivery|Payroll|Prestamos)/~', $ruta)) {
                continue;
            }
            $anterior = null;
            foreach (token_get_all(File::get($archivo->getPathname())) as $token) {
                if (is_array($token) && $token[0] === T_WHITESPACE) {
                    continue;
                }
                if (is_array($token) && $token[0] === T_RETURN && is_array($anterior) && in_array($anterior[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                    $infracciones[] = $ruta.':'.$token[2];
                }
                $anterior = $token;
            }
        }
        $this->assertSame([], $infracciones, implode('\n', $infracciones));
    }
}
