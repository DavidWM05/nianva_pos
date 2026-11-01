<?php

namespace Database\Seeders\Escenarios;

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Database\Seeders\MetodosPagoSeeder;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TwoFactorService;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use App\Modules\UnidadesMedida\Database\Seeders\UnidadesMedidaSeeder;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class EscenarioSeederBase extends Seeder
{
    protected const PASSWORD = 'password-dev-123';

    /**
     * Cada escenario es atomico: si falla a medias no deja su tenant, que
     * haria que la siguiente corrida lo diera por sembrado y lo saltara.
     *
     * @param  array<string, mixed>  $parameters
     */
    public function __invoke(array $parameters = [])
    {
        return DB::transaction(fn () => parent::__invoke($parameters));
    }

    protected function preparar(string $nombreTenant, int $semilla): ?Tenant
    {
        if (app()->environment('production')) {
            throw new RuntimeException("El escenario {$nombreTenant} no se puede ejecutar en produccion.");
        }

        fake()->seed($semilla);

        $existente = Tenant::where('nombre', $nombreTenant)->first();

        if ($existente !== null) {
            $this->avisar("{$nombreTenant}: ya existe; se omite el escenario.");

            return null;
        }

        $this->call(NucleoRolesPermisosSeeder::class);
        $this->call(MetodosPagoSeeder::class);
        $this->call(UnidadesMedidaSeeder::class);

        return Tenant::factory()->create([
            'nombre' => $nombreTenant,
            'pais' => 'MX',
            'activo' => true,
        ]);
    }

    /**
     * @param  list<string>  $modulos
     */
    protected function configurarModulos(Tenant $tenant, array $modulos): void
    {
        $configuracion = ConfiguracionTenant::firstOrNew(['tenant_id' => $tenant->id]);
        $configuracion->modulos_activos = $modulos;
        $configuracion->save();
    }

    protected function crearSucursal(Tenant $tenant, string $nombre): Sucursal
    {
        return Sucursal::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => $nombre,
        ]);
    }

    protected function rolGlobal(string $nombre): Rol
    {
        return Rol::where('tenant_id', null)->where('nombre', $nombre)->firstOrFail();
    }

    /**
     * @param  list<string>  $permisos
     */
    protected function rolTenant(Tenant $tenant, string $nombre, array $permisos): Rol
    {
        $rol = Rol::firstOrCreate(
            ['tenant_id' => $tenant->id, 'nombre' => $nombre],
            ['descripcion' => "Rol {$nombre} del escenario.", 'es_sistema' => false],
        );

        $ids = Permiso::whereIn('nombre', $permisos)->pluck('id');
        $rol->permisos()->syncWithoutDetaching($ids);

        return $rol;
    }

    /**
     * @return array{usuario: Usuario, secreto: ?string}
     */
    protected function crearUsuario(
        Tenant $tenant,
        Sucursal $sucursal,
        string $correo,
        string $nombre,
        Rol $rol,
        bool $admin = false,
    ): array {
        $usuario = Usuario::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'correo' => $correo,
            'nombre' => $nombre,
            'apellido' => 'Escenario',
            'password' => self::PASSWORD,
        ]);

        $usuario->roles()->syncWithoutDetaching([$rol->id]);

        $secreto = null;

        if ($admin) {
            $twoFactor = app(TwoFactorService::class);
            $secreto = $twoFactor->generateSecretKey();

            $usuario->forceFill([
                'two_factor_secret' => $secreto,
                'two_factor_confirmed_at' => now(),
                'two_factor_recovery_codes' => $twoFactor->generateRecoveryCodes(),
            ])->save();
        }

        return ['usuario' => $usuario, 'secreto' => $secreto];
    }

    protected function crearProveedor(Tenant $tenant, string $razonSocial): Proveedor
    {
        return Proveedor::factory()->create([
            'tenant_id' => $tenant->id,
            'razon_social' => $razonSocial,
        ]);
    }

    protected function crearCliente(Tenant $tenant, string $nombre): Cliente
    {
        return Cliente::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => $nombre,
        ]);
    }

    protected function crearDepartamento(Tenant $tenant, string $nombre): Departamento
    {
        return Departamento::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => $nombre,
        ]);
    }

    protected function crearCategoria(Tenant $tenant, string $nombre): Categoria
    {
        return Categoria::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => $nombre,
        ]);
    }

    protected function crearProducto(
        Tenant $tenant,
        Departamento $departamento,
        Categoria $categoria,
        string $nombre,
        float $precioCompra,
        float $precioVenta,
    ): Producto {
        return Producto::factory()->create([
            'tenant_id' => $tenant->id,
            'departamento_id' => $departamento->id,
            'categoria_id' => $categoria->id,
            'nombre' => $nombre,
            'precio_compra' => $precioCompra,
            'precio_venta' => $precioVenta,
        ]);
    }

    protected function crearVariante(
        Producto $producto,
        ?string $talla,
        ?string $color,
        int $unidadMedidaId,
    ): ProductoVariante {
        return ProductoVariante::factory()->create([
            'producto_id' => $producto->id,
            'talla' => $talla,
            'color' => $color,
            'unidad_medida_id' => $unidadMedidaId,
        ]);
    }

    protected function unidadId(string $abreviatura): int
    {
        return UnidadMedida::where('tenant_id', null)
            ->where('abreviatura', $abreviatura)
            ->firstOrFail()
            ->id;
    }

    protected function metodoPagoId(string $nombre): int
    {
        return MetodoPago::where('tenant_id', null)->where('nombre', $nombre)->firstOrFail()->id;
    }

    /**
     * @param  list<array{variante: ProductoVariante, cantidad: int, precio: float}>  $lineas
     */
    protected function comprar(
        Tenant $tenant,
        Sucursal $sucursal,
        Usuario $usuario,
        Proveedor $proveedor,
        array $lineas,
    ): Compra {
        $items = array_map(
            fn (array $linea) => [
                'variante_id' => $linea['variante']->id,
                'cantidad' => $linea['cantidad'],
                'precio_compra' => $linea['precio'],
            ],
            $lineas,
        );

        return app(InventarioService::class)->registrarCompra([
            'tenant_id' => $tenant->id,
            'proveedor_id' => $proveedor->id,
            'sucursal_id' => $sucursal->id,
            'usuario_id' => $usuario->id,
        ], $items);
    }

    protected function abrirCaja(Sucursal $sucursal, Usuario $usuario): CajaSesion
    {
        return app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
    }

    /**
     * @param  list<array{variante: ProductoVariante, cantidad: int}>  $items
     */
    protected function vender(
        Tenant $tenant,
        Usuario $usuario,
        Cliente $cliente,
        array $items,
        bool $pagoMixto = false,
    ): Venta {
        $itemsDto = array_map(
            fn (array $item) => ['variante_id' => $item['variante']->id, 'cantidad' => $item['cantidad']],
            $items,
        );

        [, $subtotal] = app(VentaService::class)->cotizarItems($tenant->id, $itemsDto);
        $totalCentavos = (int) round($subtotal * 100);
        $efectivo = $this->metodoPagoId('Efectivo');

        if ($pagoMixto) {
            $primerPago = intdiv($totalCentavos, 2);
            $pagos = [
                new PagoDto($efectivo, $primerPago / 100),
                new PagoDto($this->metodoPagoId('Tarjeta'), ($totalCentavos - $primerPago) / 100),
            ];
        } else {
            $pagos = [new PagoDto($efectivo, $totalCentavos / 100)];
        }

        $dto = new CrearVentaDto(
            clienteId: $cliente->id,
            items: array_map(fn (array $item) => new LineaVentaDto($item['variante_id'], $item['cantidad']), $itemsDto),
            pagos: $pagos,
            cuponCodigo: null,
            descuentoManual: 0.0,
            giftCardCodigo: null,
            notaCreditoId: null,
        );

        return app(RegistrarVenta::class)->ejecutar($dto, $usuario);
    }

    /**
     * @param  list<array{correo: string, rol: string, sucursal: string, secreto: ?string}>  $cuentas
     */
    protected function imprimirCuentas(array $cuentas): void
    {
        if (! isset($this->command)) {
            return;
        }

        $this->command->newLine();
        $this->command->table(
            ['Cuenta', 'Rol', 'Sucursal'],
            array_map(
                fn (array $cuenta) => [$cuenta['correo'], $cuenta['rol'], $cuenta['sucursal']],
                $cuentas,
            ),
        );

        foreach ($cuentas as $cuenta) {
            if ($cuenta['secreto'] !== null) {
                $this->command->line("TOTP {$cuenta['correo']}: {$cuenta['secreto']}");
            }
        }
    }

    protected function avisar(string $mensaje): void
    {
        if (isset($this->command)) {
            $this->command->warn($mensaje);
        }
    }
}
