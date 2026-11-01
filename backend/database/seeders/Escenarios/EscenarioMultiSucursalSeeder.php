<?php

namespace Database\Seeders\Escenarios;

use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Services\TenantContext;

class EscenarioMultiSucursalSeeder extends EscenarioSeederBase
{
    public function run(): void
    {
        $tenant = $this->preparar('Cadena Escenario Multi', 1301);

        if ($tenant === null) {
            return;
        }

        app(TenantContext::class)->set($tenant);

        try {
            $this->configurarModulos($tenant, ModuloActivo::MODULOS_DEFAULT);

            $sucursales = [
                $this->crearSucursal($tenant, 'Multi Centro'),
                $this->crearSucursal($tenant, 'Multi Norte'),
                $this->crearSucursal($tenant, 'Multi Sur'),
            ];

            $admin = $this->crearUsuario($tenant, $sucursales[0], 'admin@multi.test', 'Admin Multi', $this->rolGlobal('admin'), true);
            $gerenteRol = $this->rolTenant($tenant, 'gerente', [
                'sucursales.ver',
                'sucursales.todas',
                'reportes.ver',
            ]);
            $gerente = $this->crearUsuario($tenant, $sucursales[0], 'gerente@multi.test', 'Gerente Multi', $gerenteRol);
            $reportesRol = $this->rolTenant($tenant, 'reportes', ['reportes.ver']);

            $vendedores = [];

            foreach ($sucursales as $i => $sucursal) {
                $vendedor = $this->crearUsuario(
                    $tenant,
                    $sucursal,
                    'vendedor'.($i + 1).'@multi.test',
                    'Vendedor Multi '.($i + 1),
                    $this->rolGlobal('vendedor'),
                );
                $vendedor['usuario']->roles()->syncWithoutDetaching([$reportesRol->id]);
                $vendedores[] = $vendedor;
            }

            $proveedor = $this->crearProveedor($tenant, 'Proveedor Multi');
            $departamento = $this->crearDepartamento($tenant, 'Catalogo Multi');
            $categoria = $this->crearCategoria($tenant, 'General Multi');
            $unidad = $this->unidadId('und');

            $nombres = [
                'Producto Multi 1', 'Producto Multi 2', 'Producto Multi 3', 'Producto Multi 4',
                'Producto Multi 5', 'Producto Multi 6', 'Producto Multi 7', 'Producto Multi 8',
            ];

            $productos = [];

            foreach ($nombres as $i => $nombre) {
                $producto = $this->crearProducto(
                    $tenant,
                    $departamento,
                    $categoria,
                    $nombre,
                    40 + ($i * 5),
                    90 + ($i * 10),
                );

                $productos[] = [
                    'producto' => $producto,
                    'variante' => $this->crearVariante($producto, 'Unica', 'Negro', $unidad),
                ];
            }

            $clientes = [];

            for ($i = 1; $i <= 3; $i++) {
                $clientes[] = $this->crearCliente($tenant, "Cliente Multi {$i}");
            }

            foreach ($sucursales as $i => $sucursal) {
                $compra = [];

                foreach ($productos as $producto) {
                    $compra[] = [
                        'variante' => $producto['variante'],
                        'cantidad' => 10 + ($i * 10),
                        'precio' => (float) $producto['producto']->precio_compra,
                    ];
                }

                $this->comprar($tenant, $sucursal, $admin['usuario'], $proveedor, $compra);
                $this->abrirCaja($sucursal, $vendedores[$i]['usuario']);
                $this->vender($tenant, $vendedores[$i]['usuario'], $clientes[$i], [[
                    'variante' => $productos[$i]['variante'],
                    'cantidad' => $i + 1,
                ]], $i === 1);
            }

            $this->imprimirCuentas([
                ['correo' => 'admin@multi.test', 'rol' => 'admin', 'sucursal' => $sucursales[0]->nombre, 'secreto' => $admin['secreto']],
                ['correo' => 'gerente@multi.test', 'rol' => 'gerente', 'sucursal' => $sucursales[0]->nombre, 'secreto' => $gerente['secreto']],
                ['correo' => 'vendedor1@multi.test', 'rol' => 'vendedor + reportes', 'sucursal' => $sucursales[0]->nombre, 'secreto' => null],
                ['correo' => 'vendedor2@multi.test', 'rol' => 'vendedor + reportes', 'sucursal' => $sucursales[1]->nombre, 'secreto' => null],
                ['correo' => 'vendedor3@multi.test', 'rol' => 'vendedor + reportes', 'sucursal' => $sucursales[2]->nombre, 'secreto' => null],
            ]);
        } finally {
            app(TenantContext::class)->set(null);
        }
    }
}
