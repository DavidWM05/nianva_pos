<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<Usuario> */
class UsuarioFactory extends Factory
{
    protected $model = Usuario::class;

    private static ?string $passwordHash = null;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'nombre' => fake()->firstName(),
            'apellido' => fake()->lastName(),
            'alias' => fake()->userName(),
            'correo' => fake()->unique()->safeEmail(),
            'password' => self::$passwordHash ??= Hash::make('password'),
            'telefono' => fake()->numerify('555#######'),
            'activo' => true,
        ];
    }

    public function admin(): static
    {
        return $this->afterCreating(fn (Usuario $usuario) => $this->asignarRol($usuario, 'admin'));
    }

    public function vendedor(): static
    {
        return $this->afterCreating(fn (Usuario $usuario) => $this->asignarRol($usuario, 'vendedor'));
    }

    public function superadmin(): static
    {
        return $this->state(fn () => [
            'tenant_id' => null,
            'sucursal_id' => null,
        ]);
    }

    private function asignarRol(Usuario $usuario, string $nombre): void
    {
        $rol = Rol::firstOrCreate(
            ['tenant_id' => null, 'nombre' => $nombre],
            ['es_sistema' => true],
        );

        $usuario->roles()->syncWithoutDetaching([$rol->id]);
    }
}
