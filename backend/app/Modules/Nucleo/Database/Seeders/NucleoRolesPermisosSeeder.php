<?php

namespace App\Modules\Nucleo\Database\Seeders;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Roles de sistema (admin, vendedor) y su catalogo de permisos.
 *
 * El catalogo de permisos cubre tanto las tablas de este modulo (tenants,
 * sucursales, roles, permisos, usuarios, metodos_pago) como los modulos
 * que documenta nucleo_arquitectura.md pero que aun no se construyen
 * (inventario, ventas, caja, apartados, devoluciones, etc.). No hay FK de
 * permisos hacia esas tablas -- es solo un catalogo de strings modulo.accion --
 * asi que sembrarlos ahora no crea dependencia con esos modulos y evita que
 * el admin/vendedor de POS Ropa pierdan permisos cuando esos modulos se migren.
 *
 * Nota: el reparto exacto vendedor vs admin es una inferencia razonable a
 * partir del mapa de modulos del documento (vendedor = operar el POS del
 * dia a dia; admin = todo). Ajustar si la logica real de POS Ropa difiere.
 */
class NucleoRolesPermisosSeeder extends Seeder
{
    /**
     * @var array<string, list<string>>
     */
    private const PERMISOS = [
        'tenants' => ['ver', 'crear', 'editar', 'eliminar'],
        'sucursales' => ['ver', 'crear', 'editar', 'eliminar'],
        'roles' => ['ver', 'crear', 'editar', 'eliminar'],
        'permisos' => ['ver', 'crear', 'editar', 'eliminar'],
        'usuarios' => ['ver', 'crear', 'editar', 'eliminar'],
        'metodos_pago' => ['ver', 'crear', 'editar', 'eliminar'],
        'inventario' => ['ver', 'crear', 'editar', 'eliminar'],
        'compras' => ['ver', 'crear'],
        'clientes' => ['ver', 'crear', 'editar', 'eliminar'],
        'ventas' => ['ver', 'crear', 'anular'],
        'caja' => ['ver', 'abrir', 'cerrar'],
        'apartados' => ['ver', 'crear', 'abonar', 'cancelar'],
        'devoluciones' => ['ver', 'crear'],
        'gastos' => ['ver', 'crear'],
        'reglas_precio' => ['ver', 'crear', 'editar', 'eliminar'],
        'cupones' => ['ver', 'crear', 'editar', 'eliminar'],
        'configuracion' => ['ver', 'editar'],
        'reportes' => ['ver'],
        'auditoria' => ['ver'],
        // Modulos nuevos
        'cotizaciones' => ['ver', 'crear', 'editar', 'eliminar', 'convertir'],
        'cuentas_cobrar' => ['ver', 'crear', 'registrar_abono', 'anular'],
        'cuentas_pagar' => ['ver', 'registrar_pago'],
        'pedidos' => ['ver', 'crear', 'cambiar_estado', 'asignar_repartidor'],
        'gift_cards' => ['ver', 'emitir', 'recargar', 'cancelar'],
        'notas_credito' => ['ver'],
        'crm_interacciones' => ['ver', 'crear'],
        'crm_campanas' => ['enviar'],
        'loyalty' => ['ver', 'ajustar'],
        'reportes_cuentas_cobrar' => ['ver'],
        'reportes_cuentas_pagar' => ['ver'],
        'reportes_crm' => ['ver'],
        'produccion' => ['ver', 'crear', 'completar', 'transformar'],
        'payroll' => ['ver', 'crear', 'pagar'],
        'prestamos' => ['ver', 'crear', 'pagar'],
        'ventas_plazos' => ['ver', 'crear'],
    ];

    /**
     * @var list<string>
     */
    private const PERMISOS_VENDEDOR = [
        'ventas.ver', 'ventas.crear',
        'caja.ver', 'caja.abrir', 'caja.cerrar',
        'apartados.ver', 'apartados.crear', 'apartados.abonar',
        'devoluciones.ver', 'devoluciones.crear',
        'clientes.ver', 'clientes.crear',
        'gastos.crear',
        'inventario.ver',
        'metodos_pago.ver',
        // Modulos nuevos
        'cotizaciones.ver', 'cotizaciones.crear',
        'cuentas_cobrar.ver', 'cuentas_cobrar.registrar_abono',
        'pedidos.ver', 'pedidos.crear',
        'gift_cards.ver',
        'crm_interacciones.ver', 'crm_interacciones.crear',
        'loyalty.ver',
        'notas_credito.ver',
    ];

    public function run(): void
    {
        $permisos = $this->sembrarPermisos();

        $admin = Rol::firstOrCreate(
            ['tenant_id' => null, 'nombre' => 'admin'],
            ['descripcion' => 'Acceso total a todos los modulos del tenant.', 'es_sistema' => true],
        );
        $admin->permisos()->sync($permisos->pluck('id'));

        $vendedor = Rol::firstOrCreate(
            ['tenant_id' => null, 'nombre' => 'vendedor'],
            ['descripcion' => 'Opera el punto de venta: ventas, caja, apartados y devoluciones.', 'es_sistema' => true],
        );
        $vendedor->permisos()->sync(
            $permisos->whereIn('nombre', self::PERMISOS_VENDEDOR)->pluck('id'),
        );
    }

    /**
     * @return Collection<int, Permiso>
     */
    private function sembrarPermisos()
    {
        foreach (self::PERMISOS as $modulo => $acciones) {
            foreach ($acciones as $accion) {
                Permiso::firstOrCreate(
                    ['nombre' => "{$modulo}.{$accion}"],
                    ['modulo' => $modulo, 'accion' => $accion],
                );
            }
        }

        return Permiso::all();
    }
}
