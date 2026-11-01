<?php

namespace Database\Seeders\Escenarios;

use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Services\TenantContext;

class EscenarioRopaSeeder extends EscenarioSeederBase
{
    public function run(): void
    {
        $tenant = $this->preparar('Boutique Escenario Ropa', 1101);

        if ($tenant === null) {
            return;
        }

        app(TenantContext::class)->set($tenant);

        try {
            $this->configurarModulos($tenant, ModuloActivo::MODULOS_DEFAULT);

            $sucursal = $this->crearSucursal($tenant, 'Ropa Centro');
            $admin = $this->crearUsuario($tenant, $sucursal, 'admin@ropa.test', 'Admin Ropa', $this->rolGlobal('admin'), true);
            $vendedor = $this->crearUsuario($tenant, $sucursal, 'vendedor@ropa.test', 'Vendedor Ropa', $this->rolGlobal('vendedor'));

            $proveedor = $this->crearProveedor($tenant, 'Proveedor Textiles Ropa');
            $departamento = $this->crearDepartamento($tenant, 'Ropa');
            $categorias = [
                $this->crearCategoria($tenant, 'Blusas'),
                $this->crearCategoria($tenant, 'Pantalones'),
                $this->crearCategoria($tenant, 'Camisas'),
                $this->crearCategoria($tenant, 'Accesorios'),
            ];
            $unidad = $this->unidadId('und');

            $nombres = [
                'Blusa Lino', 'Blusa Manga Larga', 'Pantalon Recto', 'Pantalon Mezclilla',
                'Camisa Oxford', 'Camisa Casual', 'Falda Plisada', 'Vestido Corto',
                'Sueter Tejido', 'Chaqueta Ligera', 'Playera Basica', 'Short Deportivo',
                'Cinturon Cuero', 'Bufanda Tejida', 'Bolso Casual',
            ];

            $productos = [];

            foreach ($nombres as $i => $nombre) {
                $producto = $this->crearProducto(
                    $tenant,
                    $departamento,
                    $categorias[$i % count($categorias)],
                    $nombre,
                    50 + ($i * 5),
                    120 + ($i * 10),
                );

                $productos[] = [
                    'producto' => $producto,
                    'variantes' => [
                        $this->crearVariante($producto, 'S', 'Negro', $unidad),
                        $this->crearVariante($producto, 'M', 'Azul', $unidad),
                    ],
                ];
            }

            $clientes = [];

            for ($i = 1; $i <= 10; $i++) {
                $clientes[] = $this->crearCliente($tenant, "Cliente Ropa {$i}");
            }

            $compra = [];

            foreach ($productos as $producto) {
                foreach ($producto['variantes'] as $variante) {
                    $compra[] = [
                        'variante' => $variante,
                        'cantidad' => 20,
                        'precio' => (float) $producto['producto']->precio_compra,
                    ];
                }
            }

            $this->comprar($tenant, $sucursal, $admin['usuario'], $proveedor, $compra);
            $this->abrirCaja($sucursal, $vendedor['usuario']);

            for ($i = 0; $i < 5; $i++) {
                $this->vender(
                    $tenant,
                    $vendedor['usuario'],
                    $clientes[$i],
                    [[
                        'variante' => $productos[$i]['variantes'][0],
                        'cantidad' => $i === 3 ? 2 : 1,
                    ]],
                    $i === 4,
                );
            }

            $this->imprimirCuentas([
                [
                    'correo' => 'admin@ropa.test',
                    'rol' => 'admin',
                    'sucursal' => $sucursal->nombre,
                    'secreto' => $admin['secreto'],
                ],
                [
                    'correo' => 'vendedor@ropa.test',
                    'rol' => 'vendedor',
                    'sucursal' => $sucursal->nombre,
                    'secreto' => null,
                ],
            ]);
        } finally {
            app(TenantContext::class)->set(null);
        }
    }
}
