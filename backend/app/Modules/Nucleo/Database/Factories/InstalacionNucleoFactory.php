<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\InstalacionNucleo;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<InstalacionNucleo> */
class InstalacionNucleoFactory extends Factory
{
    protected $model = InstalacionNucleo::class;

    public function definition(): array
    {
        return [
            'identificador' => (string) Str::uuid(),
        ];
    }
}
