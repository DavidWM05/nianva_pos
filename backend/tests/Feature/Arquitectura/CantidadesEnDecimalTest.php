<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class CantidadesEnDecimalTest extends TestCase
{
    private const PENDIENTES = [];

    private const EXENTOS = [];

    public function test_las_cantidades_usan_decimal_14_3(): void
    {
        // El snapshot identifica las columnas. Las declaraciones conservan la
        // precisión y escala que SQLite normaliza como numeric.
        $snapshot = json_decode(File::get(base_path('tests/Fixtures/esquema.json')), true, flags: JSON_THROW_ON_ERROR);
        $declaraciones = $this->declaraciones();
        $incumplimientos = [];
        foreach ($snapshot as $tabla => $esquema) {
            foreach ($esquema['columnas'] as $columna) {
                $nombre = $columna['nombre'];
                if (! preg_match('/^(cantidad|stock|existencia)(_|$)/', $nombre)
                    && ! in_array($nombre, ['rendimiento', 'factor', 'factor_presentacion'], true)) {
                    continue;
                }
                $clave = $tabla.'.'.$nombre;
                $esperado = self::EXENTOS[$clave]['tipo'] ?? 'decimal(14,3)';
                $actual = $declaraciones[$clave] ?? $columna['tipo'];
                if ($actual !== $esperado) {
                    $incumplimientos[$clave] = $actual.' esperado '.$esperado;
                }
            }
        }
        $pendientes = array_keys(self::PENDIENTES);
        $encontrados = array_keys($incumplimientos);
        sort($pendientes);
        sort($encontrados);
        $this->assertSame($pendientes, $encontrados, json_encode($incumplimientos, JSON_PRETTY_PRINT));
    }

    /** @return array<string, string> */
    private function declaraciones(): array
    {
        $resultado = [];
        foreach (File::glob(app_path('Modules/*/Database/Migrations/*.php')) as $archivo) {
            $codigo = File::get($archivo);
            preg_match_all("/Schema::(?:create|table)\('([^']+)'/", $codigo, $tablas, PREG_OFFSET_CAPTURE);
            foreach ($tablas[1] as $indice => [$tabla, $inicio]) {
                $fin = $tablas[0][$indice + 1][1] ?? strlen($codigo);
                $bloque = substr($codigo, $inicio, $fin - $inicio);
                preg_match_all("/\\\$table->(decimal|unsignedDecimal|float|double|integer|unsignedInteger|bigInteger|unsignedBigInteger)\('([^']+)'(?:,\\s*(\\d+))?(?:,\\s*(\\d+))?/", $bloque, $columnas, PREG_SET_ORDER);
                foreach ($columnas as $columna) {
                    $resultado[$tabla.'.'.$columna[2]] = $columna[1].'('.($columna[3] ?? '').','.($columna[4] ?? '').')';
                }
            }
        }

        return $resultado;
    }
}
