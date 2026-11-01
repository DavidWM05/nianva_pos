<?php

namespace App\Modules\Nucleo\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

/**
 * Genera el snapshot del esquema SQLite que construyen las migraciones
 * (DAT-11). Usa una conexion temporal propia: nunca toca la base de
 * desarrollo ni la de tests.
 */
class EsquemaSnapshotCommand extends Command
{
    private const CONEXION = 'esquema_snapshot';

    protected $signature = 'esquema:snapshot
        {--check : Verifica que tests/Fixtures/esquema.json este al dia sin escribir en disco}';

    protected $description = 'Genera el snapshot del esquema SQLite desde las migraciones.';

    public function handle(): int
    {
        $rutaSnapshot = base_path('tests/Fixtures/esquema.json');
        $contenido = $this->generarSnapshot();

        if ($contenido === null) {
            return self::FAILURE;
        }

        if ($this->option('check')) {
            if (! File::exists($rutaSnapshot)
                || ! ErroresCatalogoCommand::contenidoEquivalente(File::get($rutaSnapshot), $contenido)) {
                $this->error('Snapshot desactualizado: tests/Fixtures/esquema.json. Ejecuta php artisan esquema:snapshot.');

                return self::FAILURE;
            }

            $this->info('Snapshot del esquema al dia.');

            return self::SUCCESS;
        }

        File::ensureDirectoryExists(dirname($rutaSnapshot));
        File::put($rutaSnapshot, $contenido);

        $this->info('Snapshot del esquema generado en tests/Fixtures/esquema.json');

        return self::SUCCESS;
    }

    private function generarSnapshot(): ?string
    {
        $rutaBase = storage_path('framework/testing/esquema-'.Str::ulid().'.sqlite');
        File::ensureDirectoryExists(dirname($rutaBase));
        File::put($rutaBase, '');

        $conexion = self::CONEXION;

        try {
            config([
                'database.connections.'.$conexion => [
                    'driver' => 'sqlite',
                    'database' => $rutaBase,
                    'prefix' => '',
                    'foreign_key_constraints' => true,
                ],
            ]);

            DB::purge($conexion);

            $codigo = Artisan::call('migrate:fresh', [
                '--database' => $conexion,
                '--force' => true,
                '--no-interaction' => true,
            ]);

            if ($codigo !== self::SUCCESS) {
                $this->error(Artisan::output());

                return null;
            }

            $esquema = $this->describirEsquema(Schema::connection($conexion));

            $json = json_encode(
                $esquema,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
            );

            if ($json === false) {
                $this->error('No se pudo serializar el esquema.');

                return null;
            }

            return $json."\n";
        } catch (Throwable $e) {
            $this->error('No se pudo construir el esquema: '.$e->getMessage());

            return null;
        } finally {
            DB::disconnect($conexion);
            DB::purge($conexion);
            File::delete($rutaBase);
        }
    }

    /**
     * @return array<string, array{columnas: array<int, array{nombre: string, tipo: string, nullable: bool, default: mixed}>, indices: array<int, array{nombre: string, columnas: list<string>, unico: bool}>, llaves_foraneas: array<int, array{nombre: ?string, columnas: list<string>, tabla_foranea: string, columnas_foraneas: list<string>, on_update: ?string, on_delete: ?string}>}>
     */
    private function describirEsquema(Builder $schema): array
    {
        $tablas = collect($schema->getTables())
            ->pluck('name')
            ->sort()
            ->values();

        $esquema = [];

        foreach ($tablas as $tabla) {
            $columnas = collect($schema->getColumns($tabla))
                ->map(fn (array $columna): array => [
                    'nombre' => $columna['name'],
                    'tipo' => $columna['type_name'],
                    'nullable' => (bool) $columna['nullable'],
                    'default' => $columna['default'],
                ])
                ->sortBy('nombre')
                ->values()
                ->all();

            $indices = collect($schema->getIndexes($tabla))
                ->map(fn (array $indice): array => [
                    'nombre' => $indice['name'],
                    'columnas' => $indice['columns'],
                    'unico' => (bool) $indice['unique'],
                ])
                ->sortBy('nombre')
                ->values()
                ->all();

            $llavesForaneas = collect($schema->getForeignKeys($tabla))
                ->map(fn (array $llave): array => [
                    'nombre' => $llave['name'] !== '' ? $llave['name'] : null,
                    'columnas' => $llave['columns'],
                    'tabla_foranea' => $llave['foreign_table'],
                    'columnas_foraneas' => $llave['foreign_columns'],
                    'on_update' => $llave['on_update'],
                    'on_delete' => $llave['on_delete'],
                ])
                ->sortBy(fn (array $llave): string => implode(',', $llave['columnas']).'|'.$llave['tabla_foranea'])
                ->values()
                ->all();

            $esquema[$tabla] = [
                'columnas' => $columnas,
                'indices' => $indices,
                'llaves_foraneas' => $llavesForaneas,
            ];
        }

        return $esquema;
    }
}
