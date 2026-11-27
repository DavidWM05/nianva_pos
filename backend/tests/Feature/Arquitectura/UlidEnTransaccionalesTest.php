<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use ReflectionClass;
use Tests\TestCase;

/**
 * DAT-08: las tablas transaccionales (documentos, líneas, libros, pagos, y las dudosas que
 * aprobó D-2: clientes y gift cards) llevan `ulid char(26) NOT NULL` con índice único, el
 * modelo usa TieneUlid y ninguna llave foránea apunta al ulid. Toda tabla del esquema está
 * clasificada: una tabla nueva hace fallar el test hasta que se decide si lleva ulid.
 */
class UlidEnTransaccionalesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Tablas con ulid. Las que tienen tenant_id usan UNIQUE(tenant_id, ulid) por DAT-09 (D-5).
     *
     * @var list<string>
     */
    private const CON_ULID = [
        'caja_consolidados',
        // Documentos
        'ventas', 'caja_sesiones', 'apartados', 'devoluciones', 'cotizaciones', 'compras',
        'cuentas_cobrar', 'cuentas_pagar', 'notas_credito', 'planes_pago_cliente', 'gastos',
        'ordenes_produccion', 'transformaciones_producto',
        // Líneas (DAT-03) y el cierre por método de la sesión de caja
        'venta_detalles', 'venta_linea_reglas', 'apartado_detalles', 'apartado_linea_reglas',
        'devolucion_items', 'devolucion_linea_reglas', 'cotizacion_detalles',
        'cotizacion_linea_reglas', 'compra_detalles', 'planes_pago_cliente_cuotas',
        'caja_cierre_metodos',
        // Libros de movimientos (DAT-04)
        'kardex', 'caja_movimientos', 'cuenta_cobrar_movimientos', 'plan_pago_movimientos',
        'nota_credito_usos', 'gift_card_recargas',
        // Pagos y abonos
        'venta_pagos', 'apartado_abonos', 'apartado_abono_pagos', 'devolucion_pagos',
        'abonos_cuenta', 'abonos_pagar', 'gift_card_recarga_pagos',
        // Dudosas aprobadas en D-2: nacen en la terminal
        'clientes', 'gift_cards',
    ];

    /**
     * Tablas sin ulid, con la razón de cada grupo.
     *
     * @var array<string, list<string>>
     */
    private const SIN_ULID = [
        'EXENTOS (ARQ-10): módulos congelados; D-1 los deja fuera de DAT-08' => [
            'pedidos', 'pedido_items', 'nominas', 'nomina_detalles', 'prestamos', 'prestamo_pagos',
            'loyalty_transacciones', 'crm_interacciones',
        ],
        'Proyecciones: se reconstruyen desde su libro (conciliar:libros)' => [
            'inventario_stock', 'insumo_stocks', 'caja_sesion_saldos',
        ],
        'Bitácoras internas: auditoria.registro_id apunta al id' => [
            'auditoria', 'logs_sistema',
        ],
        'Infraestructura interna de folios' => [
            'folio_contadores',
        ],
        'Infraestructura interna de idempotencia' => [
            'solicitudes_idempotentes',
        ],
        'Infraestructura interna de autorizaciones de supervisor' => [
            'autorizaciones_supervisor',
        ],
        'Catalogo de configuracion (D-2): ID numerico como sucursales y usuarios' => [
            'terminales',
        ],
        'Catálogos del back office: llegan a la terminal ya hechos' => [
            'atributo_valores', 'atributos', 'categorias', 'configuracion_seguridad',
            'configuracion_tenant', 'crm_campanas', 'cupones', 'departamentos',
            'dispositivos_confiables', 'empleados', 'insumos', 'licencia_local',
            'lista_precio_clientes', 'lista_precio_items', 'listas_precio', 'metodos_pago',
            'permisos', 'planes_suscripcion', 'presentaciones', 'producto_variantes', 'productos',
            'proveedores', 'receta_ingredientes', 'recetas', 'reglas_precio', 'rol_permisos', 'roles',
            'sucursales', 'tenants', 'unidades_medida', 'usuario_roles', 'usuarios',
            'variante_atributo_valores',
        ],
        'Infraestructura de Laravel y de la instalación' => [
            'cache', 'cache_locks', 'failed_jobs', 'instalacion_nucleo', 'job_batches', 'jobs',
            'migrations', 'password_reset_tokens', 'personal_access_tokens', 'sessions',
        ],
    ];

    public function test_toda_tabla_del_esquema_esta_clasificada_una_sola_vez(): void
    {
        $clasificadas = array_merge(self::CON_ULID, ...array_values(self::SIN_ULID));
        $repetidas = array_keys(array_filter(array_count_values($clasificadas), fn (int $n) => $n > 1));
        $this->assertSame([], $repetidas, 'Tablas clasificadas dos veces: '.implode(', ', $repetidas));

        $tablas = array_column(Schema::getTables(Schema::getCurrentSchemaName()), 'name');
        $sinClasificar = array_values(array_diff($tablas, $clasificadas));
        $this->assertSame([], $sinClasificar, 'Tablas nuevas sin clasificar (¿llevan ulid? DAT-08): '.implode(', ', $sinClasificar));

        $inexistentes = array_values(array_diff($clasificadas, $tablas));
        $this->assertSame([], $inexistentes, 'Tablas clasificadas que ya no existen: '.implode(', ', $inexistentes));
    }

    public function test_las_transaccionales_tienen_ulid_no_nulo_con_indice_unico(): void
    {
        $infracciones = [];

        foreach (self::CON_ULID as $tabla) {
            $columnas = array_column(Schema::getColumns($tabla), null, 'name');
            if (! isset($columnas['ulid'])) {
                $infracciones[] = "{$tabla}: sin columna ulid.";

                continue;
            }
            if ($columnas['ulid']['nullable']) {
                $infracciones[] = "{$tabla}: ulid admite NULL.";
            }

            $esperado = isset($columnas['tenant_id']) ? ['tenant_id', 'ulid'] : ['ulid'];
            $unicos = array_map(
                fn (array $indice) => $indice['columns'],
                array_filter(Schema::getIndexes($tabla), fn (array $indice) => (bool) $indice['unique']),
            );
            if (! in_array($esperado, $unicos, true)) {
                $infracciones[] = "{$tabla}: falta el índice único (".implode(', ', $esperado).').';
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_la_columna_se_declara_char_26_en_la_migracion_create_de_cada_tabla(): void
    {
        $migraciones = '';
        foreach (glob(app_path('Modules/*/Database/Migrations/*.php')) ?: [] as $archivo) {
            $migraciones .= (string) file_get_contents($archivo)."\n";
        }

        $infracciones = [];
        foreach (self::CON_ULID as $tabla) {
            $patron = "/Schema::create\\('".preg_quote($tabla, '/')."'.*?\\\$table->char\\('ulid',\\s*26\\)/s";
            $bloque = $this->bloqueCreate($migraciones, $tabla);
            if ($bloque === null || preg_match($patron, $bloque) !== 1) {
                $infracciones[] = "{$tabla}: su Schema::create no declara \$table->char('ulid', 26).";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_las_tablas_sin_ulid_no_lo_tienen(): void
    {
        $conUlid = [];
        foreach (array_merge(...array_values(self::SIN_ULID)) as $tabla) {
            if (Schema::hasColumn($tabla, 'ulid')) {
                $conUlid[] = $tabla;
            }
        }

        $this->assertSame([], $conUlid, 'Tienen ulid pero están en SIN_ULID (muévelas a CON_ULID): '.implode(', ', $conUlid));
    }

    public function test_ninguna_llave_foranea_usa_el_ulid(): void
    {
        $infracciones = [];

        foreach (array_column(Schema::getTables(Schema::getCurrentSchemaName()), 'name') as $tabla) {
            foreach (Schema::getForeignKeys($tabla) as $llave) {
                if (in_array('ulid', $llave['columns'], true) || in_array('ulid', $llave['foreign_columns'], true)) {
                    $infracciones[] = "{$tabla} → {$llave['foreign_table']}: la llave foránea usa ulid; las relaciones van por id (DAT-08).";
                }
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_los_modelos_de_esas_tablas_usan_tiene_ulid_y_solo_ellos(): void
    {
        $tablasConTrait = [];
        $sinTrait = [];

        foreach ($this->modelos() as $clase) {
            $modelo = (new ReflectionClass($clase))->newInstanceWithoutConstructor();
            $tabla = $modelo->getTable();
            $usa = in_array(TieneUlid::class, class_uses_recursive($clase), true);

            if ($usa) {
                $tablasConTrait[] = $tabla;
            } elseif (in_array($tabla, self::CON_ULID, true)) {
                $sinTrait[] = "{$clase} ({$tabla})";
            }
        }

        $this->assertSame([], $sinTrait, 'Modelos de tablas con ulid sin TieneUlid: '.implode(', ', $sinTrait));

        $fuera = array_values(array_diff($tablasConTrait, self::CON_ULID));
        $this->assertSame([], $fuera, 'Usan TieneUlid y su tabla no está en CON_ULID: '.implode(', ', $fuera));

        $huerfanas = array_values(array_diff(self::CON_ULID, $tablasConTrait));
        $this->assertSame([], $huerfanas, 'Tablas con ulid sin modelo que lo llene: '.implode(', ', $huerfanas));
    }

    public function test_el_id_sigue_autoincremental_y_el_ulid_nace_al_insertar(): void
    {
        foreach ($this->modelos() as $clase) {
            if (! in_array(TieneUlid::class, class_uses_recursive($clase), true)) {
                continue;
            }
            $modelo = (new ReflectionClass($clase))->newInstanceWithoutConstructor();
            $this->assertSame('id', $modelo->getKeyName(), $clase);
            $this->assertTrue($modelo->getIncrementing(), "{$clase}: el id dejó de ser autoincremental.");
            $this->assertSame('int', $modelo->getKeyType(), $clase);
            $this->assertSame(['ulid'], $modelo->uniqueIds(), $clase);
        }

        $pago = VentaPago::factory()->create();
        $venta = $pago->venta()->firstOrFail();

        foreach ([$venta, $pago, Cliente::query()->findOrFail($venta->cliente_id)] as $registro) {
            $this->assertTrue(Str::isUlid((string) $registro->ulid), $registro::class.': ulid inválido.');
            $this->assertSame(strtolower((string) $registro->ulid), $registro->ulid, $registro::class.': ulid no está en minúsculas.');
            $this->assertIsInt($registro->getKey(), $registro::class.': el id dejó de ser entero.');
        }
        $this->assertNotSame($venta->ulid, Venta::factory()->create()->ulid);
    }

    public function test_un_ulid_dado_se_respeta(): void
    {
        $ulid = strtolower((string) Str::ulid());
        $venta = Venta::factory()->create(['ulid' => $ulid]);

        $this->assertSame($ulid, $venta->fresh()?->ulid);
    }

    /**
     * @return list<class-string<Model>>
     */
    private function modelos(): array
    {
        $clases = [];
        $iterador = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(app_path('Modules')));
        foreach ($iterador as $archivo) {
            $ruta = str_replace('\\', '/', (string) $archivo);
            if (preg_match('#/Modules/(.+)/Models/([A-Za-z]+)\.php$#', $ruta, $m) !== 1) {
                continue;
            }
            $clase = 'App\\Modules\\'.str_replace('/', '\\', $m[1]).'\\Models\\'.$m[2];
            if (! class_exists($clase)) {
                continue;
            }
            $reflexion = new ReflectionClass($clase);
            if ($reflexion->isAbstract() || ! $reflexion->isSubclassOf(Model::class)) {
                continue;
            }
            $clases[] = $clase;
        }
        sort($clases);

        return $clases;
    }

    private function bloqueCreate(string $migraciones, string $tabla): ?string
    {
        $inicio = strpos($migraciones, "Schema::create('{$tabla}'");
        if ($inicio === false) {
            return null;
        }
        $fin = strpos($migraciones, '});', $inicio);

        return substr($migraciones, $inicio, $fin === false ? null : $fin - $inicio);
    }
}
