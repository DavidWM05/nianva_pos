<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

final class IdentidadLicencia
{
    private ?string $identificador = null;

    public function identificador(): string
    {
        if ($this->identificador !== null) {
            return $this->identificador;
        }

        $ruta = config('licencias.archivo_instancia');
        File::ensureDirectoryExists(dirname($ruta), 0700, true);
        $archivo = fopen($ruta, 'c+');
        if ($archivo === false) {
            throw new RuntimeException('No se pudo abrir la identidad de instalación.');
        }

        try {
            if (! flock($archivo, LOCK_EX)) {
                throw new RuntimeException('No se pudo bloquear la identidad de instalación.');
            }

            $identificador = trim((string) stream_get_contents($archivo));
            if ($identificador === '') {
                $identificador = (string) Str::uuid();
                if (fwrite($archivo, $identificador.PHP_EOL) !== strlen($identificador.PHP_EOL) || ! fflush($archivo)) {
                    throw new RuntimeException('No se pudo guardar la identidad de instalación.');
                }
            }

            if (! Str::isUuid($identificador)) {
                throw new RuntimeException('La identidad de instalación no es un UUID válido.');
            }

            return $this->identificador = $identificador;
        } finally {
            fclose($archivo);
        }
    }
}
