<?php

declare(strict_types=1);

namespace App\Aplicacion\Reportes;

use App\Modules\Metricas\Exceptions\LimiteExportacionReporteException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Enumerable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

final class ExportarReporteCsv
{
    public const LIMITE = 10000;

    /**
     * @param  array{data: array<string, mixed>, meta: array{total: int}}  $reporte
     * @param  list<string>  $columnas
     * @param  list<string>  $numericas
     * @param  list<string>  $totales
     */
    public function ejecutar(string $reporteNombre, array $reporte, array $columnas, array $numericas, array $totales): BinaryFileResponse
    {
        if ($reporte['meta']['total'] > self::LIMITE) {
            throw new LimiteExportacionReporteException(self::LIMITE);
        }

        $nombre = $reporteNombre.'-'.Str::uuid().'.csv';
        $ruta = Storage::disk('local')->path('exportaciones/'.$nombre);
        File::ensureDirectoryExists(dirname($ruta), 0700);
        $archivo = fopen($ruta, 'xb');
        if ($archivo === false) {
            throw new RuntimeException('No se pudo crear el archivo de exportación.');
        }

        try {
            try {
                $this->escribir($archivo, $columnas);

                /** @var list<array<string, scalar|null>|Model> $detalle */
                $detalle = $reporte['data']['detalle'];
                foreach ($detalle as $registro) {
                    $registro = $registro instanceof Model ? $registro->toArray() : $registro;
                    $fila = [];
                    foreach ($columnas as $columna) {
                        $valor = (string) ($registro[$columna] ?? '');
                        $fila[] = in_array($columna, $numericas, true) ? $valor : $this->textoSeguro($valor);
                    }
                    $this->escribir($archivo, $fila);
                }

                $this->escribir($archivo, []);
                $this->escribir($archivo, ['metrica', 'valor']);
                $resumen = Arr::map(
                    Arr::only($reporte['data'], $totales),
                    static fn (mixed $valor): mixed => $valor instanceof Enumerable ? $valor->all() : $valor,
                );
                foreach (Arr::dot($resumen) as $metrica => $valor) {
                    if (is_array($valor)) {
                        continue;
                    }
                    $this->escribir($archivo, [$this->textoSeguro($metrica), (string) $valor]);
                }

                if (! fflush($archivo)) {
                    throw new RuntimeException('No se pudo completar el archivo de exportación.');
                }
            } finally {
                fclose($archivo);
            }

            $respuesta = response()->download($ruta, $nombre, ['Content-Type' => 'text/csv; charset=UTF-8']);
            $respuesta->headers->set('Cache-Control', 'private, no-store');

            return $respuesta->deleteFileAfterSend();
        } catch (Throwable $error) {
            File::delete($ruta);

            throw $error;
        }
    }

    private function textoSeguro(string $valor): string
    {
        return preg_match('/^[\p{Z}\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]|^[\p{Z}\p{Cc}\p{Cf}]*[\t\r\n]/u', $valor) === 1 ? "'".$valor : $valor;
    }

    /** @param resource $archivo
     * @param  list<string>  $fila
     */
    private function escribir($archivo, array $fila): void
    {
        if (fputcsv($archivo, $fila, ',', '"', '') === false) {
            throw new RuntimeException('No se pudo escribir el archivo de exportación.');
        }
    }
}
