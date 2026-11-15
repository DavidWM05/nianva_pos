<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class DineroEnDecimalTest extends TestCase
{
    /** @var array<string, string> */
    private const PENDIENTES = [];

    /** @var array<string, array{tipo: string, razon: string}> */
    private const EXENTOS = [
        'insumos.costo' => [
            'tipo' => 'decimal(12,4)',
            'razon' => 'costo unitario de insumo de producción: 4 decimales (decisión del responsable, 2026-11-14)',
        ],
    ];

    public function test_dinero_y_tasas_respetan_precision_y_escala(): void
    {
        // SQLite conserva decimal como numeric. El snapshot DAT-11 identifica las
        // columnas reales y la declaración de la migración conserva precisión y escala.
        $snapshot = json_decode(File::get(base_path('tests/Fixtures/esquema.json')), true, flags: JSON_THROW_ON_ERROR);
        $declaraciones = $this->declaraciones();
        $incumplimientos = [];
        $exentosEncontrados = [];
        foreach ($snapshot as $tabla => $esquema) {
            foreach ($esquema['columnas'] as $columna) {
                $nombre = $columna['nombre'];
                $clave = $tabla.'.'.$nombre;
                $tasa = preg_match('/^(tasa|porcentaje)(_|$)/', $nombre) || $nombre === 'interes';
                $mixto = in_array($clave, ['cupones.valor', 'reglas_precio.valor'], true);
                $dinero = preg_match('/^(precio|monto|total|subtotal|costo|saldo|descuento|abono)(_|$)/', $nombre)
                    || in_array($nombre, ['diferencia', 'salario_base', 'percepciones', 'deducciones', 'neto', 'interes_total'], true);
                if ($clave === 'job_batches.total_jobs') {
                    continue; // Conteo de trabajos de la cola de Laravel.
                }
                if ((! $tasa && ! $mixto && ! $dinero) || str_ends_with($nombre, '_id')) {
                    continue;
                }
                $esperado = $tasa ? 'decimal(7,4)' : 'decimal(12,2)';
                $actual = $declaraciones[$clave] ?? $columna['tipo'];
                if (isset(self::EXENTOS[$clave])) {
                    $this->assertSame(self::EXENTOS[$clave]['tipo'], $actual, self::EXENTOS[$clave]['razon']);
                    $exentosEncontrados[] = $clave;

                    continue;
                }
                if (isset(self::PENDIENTES[$clave])) {
                    $this->assertSame('decimal(10,2)', $actual, $clave.' debe conservar su tipo hasta resolver el almacenamiento mixto.');
                }
                if ($mixto || $actual !== $esperado) {
                    $incumplimientos[$clave] = $actual.'; esperado '.$esperado;
                }
            }
        }
        $this->assertSame(array_keys(self::EXENTOS), $exentosEncontrados, 'Las columnas exentas deben existir en el snapshot.');
        $pendientes = array_keys(self::PENDIENTES);
        $encontrados = array_keys($incumplimientos);
        sort($pendientes);
        sort($encontrados);
        $this->assertSame($pendientes, $encontrados, json_encode($incumplimientos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
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
                preg_match_all("/\\\$table->(decimal|unsignedDecimal|float|double)\('([^']+)'(?:,\\s*(\\d+))?(?:,\\s*(\\d+))?/", $bloque, $columnas, PREG_SET_ORDER);
                foreach ($columnas as $columna) {
                    $resultado[$tabla.'.'.$columna[2]] = $columna[1].'('.($columna[3] ?? '').','.($columna[4] ?? '').')';
                }
            }
        }

        return $resultado;
    }
}
