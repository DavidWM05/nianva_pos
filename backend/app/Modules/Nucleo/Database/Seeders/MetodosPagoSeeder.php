<?php

namespace App\Modules\Nucleo\Database\Seeders;

use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Database\Seeder;

/**
 * Catalogo global de metodos de pago (tenant_id NULL -- ver la migracion
 * create_metodos_pago_table). Sin este seeder, un tenant nuevo no tiene
 * ningun metodo de pago para elegir en la pantalla de venta: no se siembra
 * desde un TenantObserver (como "Publico General" en Crm) porque esto es
 * un catalogo *compartido*, no algo propio de cada tenant.
 */
class MetodosPagoSeeder extends Seeder
{
    /**
     * @var list<array{nombre: string, tipo: string}>
     */
    private const METODOS = [
        ['nombre' => 'Efectivo', 'tipo' => 'efectivo', 'incluir_en_financiero' => true],
        ['nombre' => 'Tarjeta', 'tipo' => 'tarjeta', 'incluir_en_financiero' => true],
        ['nombre' => 'Transferencia', 'tipo' => 'transferencia', 'incluir_en_financiero' => true],
        ['nombre' => 'Gift Card', 'tipo' => 'digital', 'incluir_en_financiero' => false],
        ['nombre' => 'Nota de Crédito', 'tipo' => 'digital', 'incluir_en_financiero' => false],
        ['nombre' => 'Yape / Plin', 'tipo' => 'digital', 'incluir_en_financiero' => false],
        ['nombre' => 'Cheque', 'tipo' => 'otro', 'incluir_en_financiero' => true],
    ];

    public function run(): void
    {
        foreach (self::METODOS as $metodo) {
            MetodoPago::firstOrCreate(
                ['tenant_id' => null, 'nombre' => $metodo['nombre']],
                ['tipo' => $metodo['tipo'], 'incluir_en_financiero' => $metodo['incluir_en_financiero'], 'activo' => true],
            );
        }
    }
}
