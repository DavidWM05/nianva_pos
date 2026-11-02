<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Detecta texto danado en columnas de texto de la base (DAT-12):
 * U+FFFD o doble codificacion UTF-8. Solo reporta; no corrige.
 */
class ConciliarTextoCommand extends Command
{
    protected $signature = 'conciliar:texto';

    protected $description = 'Reporta columnas de texto con U+FFFD o doble codificacion UTF-8.';

    public function handle(): int
    {
        $hallazgos = 0;

        foreach (Schema::getTables() as $tabla) {
            $nombreTabla = $tabla['name'];
            $columnas = collect(Schema::getColumns($nombreTabla));

            $id = $columnas->firstWhere('name', 'id');

            if ($id === null) {
                continue;
            }

            foreach ($columnas as $columna) {
                $tipo = strtolower($columna['type_name']);

                // SQLite reporta varchar/text/json; MySQL agrega char y las variantes de text.
                if (! in_array($tipo, ['char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext', 'json'], true)) {
                    continue;
                }

                $nombreColumna = $columna['name'];

                foreach (DB::table($nombreTabla)->select(['id', $nombreColumna])->cursor() as $fila) {
                    $valor = $fila->{$nombreColumna};

                    if (is_array($valor)) {
                        $valor = json_encode($valor, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }

                    if (! is_string($valor) || ! $this->estaDanado($valor)) {
                        continue;
                    }

                    $hallazgos++;
                    $this->line(sprintf(
                        '%s.%s id=%s extracto=%s',
                        $nombreTabla,
                        $nombreColumna,
                        $fila->id,
                        Str::limit(str_replace(["\r", "\n"], ' ', $valor), 120),
                    ));
                }
            }
        }

        if ($hallazgos > 0) {
            $this->error("Se encontraron {$hallazgos} valores con texto danado.");

            return self::FAILURE;
        }

        $this->info('No se encontraron valores con U+FFFD ni doble codificacion.');

        return self::SUCCESS;
    }

    private function estaDanado(string $texto): bool
    {
        if (str_contains($texto, "\u{FFFD}")) {
            return true;
        }

        return preg_match('/\x{00C3}[\x{00A1}\x{00A9}\x{00AD}\x{00B3}\x{00BA}\x{00B1}\x{2018}\x{2030}\x{201C}]|\x{00C2}[^\x{0020}-\x{007E}]/u', $texto) === 1;
    }
}
