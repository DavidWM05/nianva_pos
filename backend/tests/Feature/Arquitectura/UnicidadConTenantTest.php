<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UnicidadConTenantTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Excepciones aprobadas: indice unico sin tenant_id como primera columna.
     *
     * @var array<string, string>
     */
    private const EXCEPCIONES = [
        'usuarios.correo' => 'El login busca por correo antes de conocer el tenant (AuthController).',
        'empleados.usuario_id' => 'Relacion uno a uno empleado-usuario dentro del mismo tenant.',
    ];

    public function test_los_indices_unicos_de_tablas_con_tenant_empiezan_por_tenant_id(): void
    {
        $infracciones = [];

        foreach (Schema::getTables() as $tablaInfo) {
            $tabla = $tablaInfo['name'];

            if (! Schema::hasColumn($tabla, 'tenant_id')) {
                continue;
            }

            foreach (Schema::getIndexes($tabla) as $indice) {
                if (($indice['primary'] ?? false) || ! ($indice['unique'] ?? false)) {
                    continue;
                }

                $columnas = $indice['columns'];

                if (($columnas[0] ?? null) === 'tenant_id') {
                    continue;
                }

                $clave = $tabla.'.'.implode(',', $columnas);

                if (isset(self::EXCEPCIONES[$clave])) {
                    continue;
                }

                $infracciones[] = "{$tabla}: indice unico (".implode(', ', $columnas).') sin tenant_id como primera columna.';
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
