<?php

namespace Tests\Feature\Factories;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Payroll\Models\NominaDetalle;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Prestamos\Models\PrestamoPago;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\Produccion\Models\TransformacionProducto;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;
use Tests\TestCase;

class FactoriesExtensionesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{class-string}>
     */
    public static function modelos(): array
    {
        $modelos = [
            Cotizacion::class, CotizacionDetalle::class,
            CrmCampana::class, CrmInteraccion::class, LoyaltyTransaccion::class,
            AbonoCuenta::class, CuentaCobrar::class,
            AbonoPagar::class, CuentaPagar::class,
            Pedido::class, PedidoItem::class,
            GiftCard::class, GiftCardRecarga::class,
            NotaCredito::class, NotaCreditoUso::class,
            Empleado::class, Nomina::class, NominaDetalle::class,
            Prestamo::class, PrestamoPago::class,
            Insumo::class, InsumoStock::class, OrdenProduccion::class,
            Receta::class, RecetaIngrediente::class, TransformacionProducto::class,
            UnidadMedida::class,
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
        $this->assertRelacionesCoherentes($sinContexto);

        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $conContexto = $modelo::factory()->create();

        $this->assertTrue($conContexto->exists);
        $this->assertRelacionesCoherentes($conContexto);

        $atributos = $conContexto->getAttributes();

        if (array_key_exists('tenant_id', $atributos) && $atributos['tenant_id'] !== null) {
            $this->assertSame($tenant->id, $atributos['tenant_id'], "{$modelo} no uso el tenant del contexto.");
        }

        $this->assertCount(3, $modelo::factory()->count(3)->create());
    }

    private function assertRelacionesCoherentes(object $modelo): void
    {
        if (! method_exists($modelo, 'getAttributes')) {
            return;
        }

        $tenants = [];
        $atributos = $modelo->getAttributes();

        if (array_key_exists('tenant_id', $atributos) && $atributos['tenant_id'] !== null) {
            $tenants[] = $atributos['tenant_id'];
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

            if (array_key_exists('tenant_id', $atributosRelacion) && $atributosRelacion['tenant_id'] !== null) {
                $tenants[] = $atributosRelacion['tenant_id'];
            }
        }

        if ($tenants !== []) {
            $this->assertCount(1, array_unique($tenants), "{$modelo} mezcla tenants en sus relaciones.");
        }
    }
}
