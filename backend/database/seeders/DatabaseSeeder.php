<?php

namespace Database\Seeders;

use App\Modules\Nucleo\Database\Seeders\MetodosPagoSeeder;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(NucleoRolesPermisosSeeder::class);
        $this->call(MetodosPagoSeeder::class);
    }
}
