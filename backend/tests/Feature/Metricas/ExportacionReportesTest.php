<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Aplicacion\Reportes\ExportarReporteCsv;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class ExportacionReportesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_ventas_exige_ambos_permisos_y_autenticacion(): void
    {
        $url = '/api/v1/ventas/reporte/exportar';
        $this->getJson($url)->assertUnauthorized();

        foreach (['reportes.ver', 'reportes.exportar'] as $permiso) {
            $usuario = Usuario::factory()->create();
            $this->darPermisosA($usuario, [$permiso]);
            $this->actingAs($usuario)->getJson($url)->assertForbidden();
        }
    }

    public function test_el_csv_respeta_filtro_sucursal_tenant_y_totales_y_se_elimina_al_enviar(): void
    {
        $disco = Storage::fake('local');
        $tenant = Tenant::factory()->create();
        $propia = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $otra = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id]);
        $this->darPermisosA($usuario, ['reportes.ver', 'reportes.exportar']);
        $fecha = '2026-06-11 12:00:00';
        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id, 'fecha' => $fecha, 'total' => '80.20', 'folio' => '=1+1']);
        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $otra->id, 'fecha' => $fecha, 'folio' => 'V-OTRA']);
        Venta::factory()->create(['fecha' => $fecha, 'folio' => 'V-AJENA']);
        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id, 'fecha' => '2026-06-10 12:00:00', 'folio' => 'V-FUERA']);

        $filtro = '?fecha_desde=2026-06-11&fecha_hasta=2026-06-11&sucursal_id='.$otra->id;
        $this->actingAs($usuario);
        $api = $this->getJson('/api/v1/ventas/reporte'.$filtro)->assertOk()->assertJsonPath('meta.total', 1);
        $respuesta = $this->get('/api/v1/ventas/reporte/exportar'.$filtro)->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $archivos = $disco->allFiles('exportaciones');
        self::assertCount(1, $archivos);
        $this->get('/storage/'.$archivos[0])->assertNotFound();
        ob_start();
        try {
            $respuesta->baseResponse->sendContent();
            $csv = (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
        self::assertStringContainsString("venta,'=1+1,", $csv);
        self::assertStringContainsString('vendido,'.$api->json('data.totales.vendido'), $csv);
        self::assertStringNotContainsString('V-OTRA', $csv);
        self::assertStringNotContainsString('V-AJENA', $csv);
        self::assertStringNotContainsString('V-FUERA', $csv);
        self::assertSame([], $disco->allFiles('exportaciones'));
    }

    /** @return array<string, array{string, string, string, string, string}> */
    public static function extensiones(): array
    {
        return [
            'cobrar' => ['/cuentas-cobrar', 'reportes_cuentas_cobrar.ver', CuentaCobrar::class, 'total_pendiente', 'saldo_pendiente'],
            'pagar' => ['/cuentas-pagar', 'reportes_cuentas_pagar.ver', CuentaPagar::class, 'total_pendiente', 'saldo_pendiente'],
            'crm' => ['/crm', 'reportes_crm.ver', CrmCampana::class, 'loyalty.saldo_actual_total', 'destinatarios'],
        ];
    }

    /** @param class-string<CuentaCobrar|CuentaPagar|CrmCampana> $modelo */
    #[DataProvider('extensiones')]
    public function test_exporta_el_detalle_completo_y_copia_totales_de_la_api(
        string $ruta,
        string $permiso,
        string $modelo,
        string $metrica,
        string $campo,
    ): void {
        $disco = Storage::fake('local');
        $tenant = Tenant::factory()->create();
        $ajeno = Tenant::factory()->create();
        $lector = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $atributos = $modelo === CrmCampana::class ? ['asunto' => " \t@SUM(1)", $campo => 7] : [$campo => '25.74'];
        $modelo::factory()->count(2)->create(['tenant_id' => $tenant->id, ...$atributos]);
        $modelo::factory()->create(['tenant_id' => $ajeno->id, ...$atributos]);

        $this->darPermisosA($lector, [$permiso]);
        $this->darPermisosA($usuario, [$permiso, 'reportes.exportar']);
        $url = '/api/v1'.$ruta.'/reporte';
        $this->getJson($url.'/exportar')->assertUnauthorized();
        $this->actingAs($lector)->getJson($url.'/exportar')->assertForbidden();
        $this->getJson($url)->assertOk()->assertJsonPath('meta.permisos.exportar', false);

        $this->actingAs($usuario);
        $api = $this->getJson($url.'?rows=2')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('meta.permisos.exportar', true);
        $respuesta = $this->get($url.'/exportar?page=2&rows=1')->assertOk();
        $csv = $this->contenido($respuesta->baseResponse);
        self::assertStringContainsString($metrica.','.$api->json('data.'.$metrica), $csv);
        $detalle = preg_split('/\r?\n\r?\n/', $csv, 2)[0];
        $filas = array_map(static fn (string $fila): array => str_getcsv($fila, ',', '"', ''), preg_split('/\r?\n/', $detalle));
        $columnas = array_shift($filas);
        $indice = array_search($campo, $columnas, true);
        self::assertNotFalse($indice);
        self::assertSame(array_map('strval', array_column($api->json('data.detalle'), 'id')), array_column($filas, 0));
        self::assertSame(array_map('strval', array_column($api->json('data.detalle'), $campo)), array_column($filas, $indice));
        if ($modelo === CrmCampana::class) {
            self::assertSame(["' \t@SUM(1)", "' \t@SUM(1)"], array_column($filas, 1));
        }
        self::assertSame([], $disco->allFiles('exportaciones'));
    }

    public function test_el_tope_permite_10000_filas_y_rechaza_10001_sin_dejar_archivo(): void
    {
        $disco = Storage::fake('local');
        $usuario = Usuario::factory()->create();
        $this->darPermisosA($usuario, ['reportes.ver', 'reportes.exportar']);
        $venta = Venta::factory()->create([
            'tenant_id' => $usuario->tenant_id,
            'sucursal_id' => $usuario->sucursal_id,
            'fecha' => '2026-06-11 12:00:00',
        ]);
        $base = $venta->getAttributes();
        unset($base['id']);

        for ($lote = 0; $lote < 100; $lote++) {
            $filas = [];
            for ($i = 0; $i < ($lote === 99 ? 99 : 100); $i++) {
                $filas[] = [...$base, 'ulid' => (string) Str::ulid()];
            }
            Venta::query()->insert($filas);
        }
        $url = '/api/v1/ventas/reporte/exportar?fecha_desde=2026-06-11&fecha_hasta=2026-06-11';
        $this->actingAs($usuario);
        $respuesta = $this->get($url)->assertOk();
        self::assertSame(10000, substr_count($this->contenido($respuesta->baseResponse), "\nventa,"));
        Venta::query()->insert([...$base, 'ulid' => (string) Str::ulid()]);

        $this->getJson($url)->assertUnprocessable()->assertJsonPath('error_code', 'reporte_exportacion_limite');
        self::assertSame([], $disco->allFiles('exportaciones'));
    }

    public function test_limpia_el_archivo_si_falla_la_generacion(): void
    {
        $disco = Storage::fake('local');
        $registro = new class extends Model
        {
            public function toArray(): array
            {
                throw new RuntimeException('Error de serialización de prueba');
            }
        };

        $this->expectExceptionMessage('Error de serialización de prueba');
        try {
            (new ExportarReporteCsv)->ejecutar(
                'prueba',
                ['data' => ['detalle' => [$registro]], 'meta' => ['total' => 1]],
                ['folio'],
                [],
                [],
            );
        } finally {
            self::assertSame([], $disco->allFiles('exportaciones'));
        }
    }

    private function contenido(BinaryFileResponse $respuesta): string
    {
        ob_start();
        try {
            $respuesta->sendContent();

            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }
}
