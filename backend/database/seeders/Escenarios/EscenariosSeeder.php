<?php

namespace Database\Seeders\Escenarios;

use Illuminate\Database\Seeder;
use RuntimeException;

class EscenariosSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Los escenarios de demostracion no se pueden ejecutar en produccion.');
        }

        $this->call([
            EscenarioRopaSeeder::class,
            EscenarioAbarrotesSeeder::class,
            EscenarioMultiSucursalSeeder::class,
            EscenarioLiteSeeder::class,
        ]);
    }
}
