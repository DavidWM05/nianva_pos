<?php

namespace App\Modules\UnidadesMedida\Database\Seeders;

use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Seeder;

/**
 * Catalogo global de unidades de medida (tenant_id NULL) que todo tenant
 * nuevo recibe por defecto. Mismo patron que MetodosPagoSeeder.
 */
class UnidadesMedidaSeeder extends Seeder
{
    /**
     * @var list<array{nombre: string, abreviatura: string, tipo: string}>
     */
    private const UNIDADES = [
        ['nombre' => 'Unidad', 'abreviatura' => 'und', 'tipo' => 'entero'],
        ['nombre' => 'Kilogramo', 'abreviatura' => 'kg', 'tipo' => 'fraccionario'],
        ['nombre' => 'Litro', 'abreviatura' => 'l', 'tipo' => 'fraccionario'],
        ['nombre' => 'Metro', 'abreviatura' => 'm', 'tipo' => 'fraccionario'],
        ['nombre' => 'Balde', 'abreviatura' => 'bal', 'tipo' => 'entero'],
        ['nombre' => 'Bolsa', 'abreviatura' => 'bol', 'tipo' => 'entero'],
        ['nombre' => 'Caja', 'abreviatura' => 'cja', 'tipo' => 'entero'],
        ['nombre' => 'Rollo', 'abreviatura' => 'rol', 'tipo' => 'entero'],
        ['nombre' => 'Par', 'abreviatura' => 'par', 'tipo' => 'entero'],
        ['nombre' => 'Pliego', 'abreviatura' => 'pli', 'tipo' => 'entero'],
        ['nombre' => 'Varilla', 'abreviatura' => 'var', 'tipo' => 'entero'],
        ['nombre' => 'Tubo', 'abreviatura' => 'tbo', 'tipo' => 'entero'],
    ];

    public function run(): void
    {
        foreach (self::UNIDADES as $unidad) {
            UnidadMedida::firstOrCreate(
                ['tenant_id' => null, 'abreviatura' => $unidad['abreviatura']],
                ['nombre' => $unidad['nombre'], 'tipo' => $unidad['tipo'], 'activo' => true],
            );
        }
    }
}
