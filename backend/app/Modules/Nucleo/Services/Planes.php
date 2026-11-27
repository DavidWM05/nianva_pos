<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Exceptions\FeatureNoConcedidaException;
use App\Modules\Nucleo\Exceptions\ModuloNoActivoException;

final class Planes
{
    public const BASICO = [
        'tpv', 'catalogo', 'caja', 'inventario', 'compras_proveedores', 'devoluciones', 'reportes', 'administracion',
    ];

    public const AVANZADO = [
        'multicaja', 'clientes', 'apartados', 'cupones_promociones_mayoreo', 'credito_clientes',
        'cotizaciones', 'notas_credito', 'gift_cards', 'reportes_csv',
    ];

    public const PRO = ['cxp', 'ventas_plazos', 'produccion', 'multisucursal'];

    public const CONGELADAS = ['crm_avanzado', 'delivery', 'payroll', 'prestamos'];

    public const MODULOS = [
        'cotizaciones' => 'cotizaciones',
        'cxc' => 'credito_clientes',
        'cxp' => 'cxp',
        'crm_avanzado' => 'crm_avanzado',
        'delivery' => 'delivery',
        'gift_cards' => 'gift_cards',
        'notas_credito' => 'notas_credito',
        'produccion' => 'produccion',
        'ventas_plazos' => 'ventas_plazos',
        'payroll' => 'payroll',
        'prestamos' => 'prestamos',
    ];

    public function __construct(private readonly FuenteConcesion $fuente) {}

    public function catalogo(string $codigo, int $paquetes = 0, int $terminalesAdicionales = 0): ConcesionPlan
    {
        $entornoPropio = config('planes.entorno') === 'propio';
        $sucursales = $codigo === 'pro' && $entornoPropio ? 1 + max(0, $paquetes) : 1;

        return match ($codigo) {
            'pro' => new ConcesionPlan('pro', [
                ...self::BASICO, ...self::AVANZADO,
                ...($entornoPropio ? self::PRO : array_diff(self::PRO, ['multisucursal'])),
            ], 5 * $sucursales + max(0, $terminalesAdicionales), $sucursales),
            'avanzado' => new ConcesionPlan('avanzado', [...self::BASICO, ...self::AVANZADO], 3, 1),
            default => new ConcesionPlan('basico', self::BASICO, 1, 1),
        };
    }

    public function deTenant(int $tenantId): ConcesionPlan
    {
        $local = $this->fuente->para($tenantId);
        if ($local === null) {
            return $this->catalogo('basico');
        }

        $conocidas = [...self::BASICO, ...self::AVANZADO, ...self::PRO, ...self::CONGELADAS];
        $features = array_values(array_intersect($local['features'], $conocidas));
        $entornoPropio = config('planes.entorno') === 'propio';
        if (! $entornoPropio) {
            $features = array_values(array_diff($features, ['multisucursal']));
        }

        return new ConcesionPlan(
            $local['plan_codigo'],
            $features,
            $local['cuotas']['terminales'],
            $entornoPropio ? $local['cuotas']['sucursales'] : 1,
        );
    }

    public function exigirModulo(int $tenantId, string $modulo): void
    {
        $this->exigir($tenantId, self::MODULOS[$modulo]);
        $modulos = ConfiguracionTenant::sinTenant()->where('tenant_id', $tenantId)->first()?->getAttribute('modulos_activos');
        if ($modulos !== null && ! in_array($modulo, $modulos, true)) {
            throw new ModuloNoActivoException($modulo);
        }
    }

    public function exigir(int $tenantId, string $feature): void
    {
        if (! $this->deTenant($tenantId)->incluye($feature)) {
            throw new FeatureNoConcedidaException($feature);
        }
    }
}
