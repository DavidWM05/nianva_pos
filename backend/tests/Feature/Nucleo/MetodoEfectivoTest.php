<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Database\Seeders\MetodosPagoSeeder;
use App\Modules\Nucleo\Exceptions\MetodoEfectivoNoExisteException;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MetodoEfectivoTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_migracion_crea_un_solo_efectivo_global_sin_ejecutar_seeders(): void
    {
        $globales = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->get();

        $this->assertCount(1, $globales);
        $this->assertSame('efectivo', $globales->sole()->tipo);
        $this->assertTrue((bool) $globales->sole()->incluir_en_financiero);
        $this->assertTrue((bool) $globales->sole()->activo);
    }

    public function test_el_seeder_reutiliza_el_efectivo_global_de_la_migracion(): void
    {
        $antes = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->value('id');
        $this->assertNotNull($antes);

        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        MetodoPago::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $this->seed(MetodosPagoSeeder::class);
        $this->seed(MetodosPagoSeeder::class);

        $consulta = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo');
        $this->assertSame(1, $consulta->count());
        $this->assertSame($antes, $consulta->value('id'));
        $this->assertSame(1, DB::table('metodos_pago')->where('tenant_id', $tenant->id)->where('nombre', 'Efectivo')->count());
    }

    public function test_el_resolvedor_prefiere_el_efectivo_del_tenant_al_global(): void
    {
        $globalId = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->value('id');
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $local = MetodoPago::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $this->assertSame($local->id, MetodoEfectivo::id());
        $this->assertNotSame($globalId, MetodoEfectivo::id());
    }

    public function test_el_resolvedor_no_depende_de_un_id_fijo(): void
    {
        DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->delete();
        MetodoPago::factory()->global()->create(['nombre' => 'Otro método', 'tipo' => 'otro']);
        $global = MetodoPago::factory()->global()->create(['nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $this->assertSame($global->id, MetodoEfectivo::id());
    }

    public function test_si_falta_el_global_resuelve_el_efectivo_del_tenant(): void
    {
        DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->delete();
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $local = MetodoPago::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $this->assertSame($local->id, MetodoEfectivo::id());
    }

    public function test_si_falta_efectivo_no_elige_otro_metodo_global(): void
    {
        DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->delete();
        MetodoPago::factory()->global()->create(['nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);

        try {
            MetodoEfectivo::id();
            $this->fail('El resolvedor no debe sustituir el Efectivo global faltante.');
        } catch (MetodoEfectivoNoExisteException $error) {
            $this->assertSame('metodo_efectivo_no_existe', $error->errorCode());
            $this->assertSame(422, $error->status());
        }
    }

    public function test_si_el_tenant_tiene_varios_efectivos_se_elige_el_de_menor_id(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $primero = MetodoPago::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Fondo A', 'tipo' => 'efectivo']);
        MetodoPago::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Fondo B', 'tipo' => 'efectivo']);
        $this->assertSame($primero->id, MetodoEfectivo::id());
    }

    public function test_un_efectivo_de_otro_tenant_no_impide_usar_el_global(): void
    {
        $tenant = Tenant::factory()->create();
        $otro = Tenant::factory()->create();
        MetodoPago::factory()->create(['tenant_id' => $otro->id, 'nombre' => 'Fondo ajeno', 'tipo' => 'efectivo']);
        app(TenantContext::class)->set($tenant);
        $global = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', 'Efectivo')->value('id');
        $this->assertSame($global, MetodoEfectivo::id());
    }
}
