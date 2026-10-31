<?php

namespace Tests\Feature\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Auditoria\Models\LogSistema;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Models\PlanPagoClienteCuota;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\InstalacionNucleo;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\PlanSuscripcion;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;
use Tests\TestCase;

class FactoriesBaseTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{class-string}>
     */
    public static function modelos(): array
    {
        $modelos = [
            Tenant::class, Sucursal::class, Usuario::class, Rol::class, Permiso::class,
            MetodoPago::class, ConfiguracionSeguridad::class, DispositivoConfiable::class,
            InstalacionNucleo::class, LicenciaLocal::class, PlanSuscripcion::class,
            ConfiguracionTenant::class, Auditoria::class, LogSistema::class,
            Categoria::class, Departamento::class, Producto::class, ProductoVariante::class,
            Proveedor::class, InventarioStock::class, Kardex::class, Compra::class, CompraDetalle::class,
            Cupon::class, ReglaPrecio::class, Cliente::class, PlanPagoCliente::class,
            PlanPagoClienteCuota::class, CajaSesion::class, Venta::class, VentaDetalle::class,
            VentaPago::class, Apartado::class, ApartadoDetalle::class, ApartadoAbono::class,
            ApartadoAbonoPago::class, Devolucion::class, DevolucionItem::class, DevolucionPago::class,
            Gasto::class,
        ];

        return collect($modelos)->mapWithKeys(
            fn (string $modelo) => [$modelo => [$modelo]],
        )->all();
    }

    #[DataProvider('modelos')]
    public function test_la_factory_crea_modelos_coherentes(string $modelo): void
    {
        app()->forgetInstance(TenantContext::class);

        /** @var Factory $factory */
        $factory = $modelo::factory();
        $sinContexto = $factory->create();

        $this->assertTrue($sinContexto->exists);
        $this->assertRelacionesMismoTenant($sinContexto);

        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $conContexto = $modelo::factory()->create();

        $this->assertTrue($conContexto->exists);
        $this->assertRelacionesMismoTenant($conContexto);

        $atributos = $conContexto->getAttributes();

        if (array_key_exists('tenant_id', $atributos) && $atributos['tenant_id'] !== null) {
            $this->assertSame($tenant->id, $atributos['tenant_id'], "{$modelo} no uso el tenant del contexto.");
        }

        $this->assertCount(3, $modelo::factory()->count(3)->create());
    }

    private function assertRelacionesMismoTenant(object $modelo): void
    {
        if (! method_exists($modelo, 'getAttributes')) {
            return;
        }

        $atributos = $modelo->getAttributes();

        if (! array_key_exists('tenant_id', $atributos) || $atributos['tenant_id'] === null) {
            return;
        }

        $reflejo = new ReflectionClass($modelo);

        foreach ($reflejo->getMethods(ReflectionMethod::IS_PUBLIC) as $metodo) {
            if ($metodo->getNumberOfParameters() > 0) {
                continue;
            }

            $retorno = $metodo->getReturnType();

            if (! $retorno instanceof ReflectionNamedType || $retorno->getName() !== BelongsTo::class) {
                continue;
            }

            $relacion = $modelo->{$metodo->getName()}()->first();

            if ($relacion === null) {
                continue;
            }

            $atributosRelacion = $relacion->getAttributes();

            if (! array_key_exists('tenant_id', $atributosRelacion) || $atributosRelacion['tenant_id'] === null) {
                continue;
            }

            $this->assertSame(
                $atributos['tenant_id'],
                $atributosRelacion['tenant_id'],
                "{$modelo}::{$metodo->getName()}() no comparte el tenant.",
            );
        }
    }
}
