<?php

namespace App\Modules\Nucleo\Database\Seeders;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Database\Seeder;

/**
 * Usuarios de ejemplo para desarrollo local. A diferencia de
 * NucleoRolesPermisosSeeder/MetodosPagoSeeder (que corren siempre, vía
 * DatabaseSeeder::run()), este seeder NUNCA se llama desde ahí a propósito
 * -- solo se ejecuta invocándolo explícitamente:
 *
 *      php artisan db:seed --class=DesarrolloSeeder
 *
 * para que no haya riesgo de que un `migrate --seed` en un entorno que no
 * es local termine creando estas cuentas. Ver backend/README.md, sección
 * "Usuarios de prueba para desarrollo".
 *
 * NUNCA correr en un entorno de producción.
 *
 * Idempotente en tenant/sucursal/usuarios (firstOrCreate) -- correrlo
 * varias veces no los duplica. El secreto 2FA del admin sí se regenera en
 * cada corrida (ver el aviso impreso en consola al final).
 */
class DesarrolloSeeder extends Seeder
{
    private const CORREO_ADMIN = 'admin@nucleo.test';

    private const CORREO_VENDEDOR = 'vendedor@nucleo.test';

    private const PASSWORD = 'password-dev-123';

    public function run(): void
    {
        // Garantiza que existan los roles admin/vendedor (y su catalogo de
        // permisos) aunque este seeder se corra sin haber pasado antes por
        // `migrate --seed` -- firstOrCreate() adentro lo vuelve seguro de
        // llamar de nuevo aunque ya hayan sido sembrados.
        $this->call(NucleoRolesPermisosSeeder::class);

        $tenant = Tenant::firstOrCreate(
            ['nombre' => 'Tenant de Desarrollo'],
            ['pais' => 'MX', 'activo' => true],
        );

        $sucursal = Sucursal::firstOrCreate(
            ['tenant_id' => $tenant->id, 'nombre' => 'Sucursal Principal'],
            ['activo' => true],
        );

        $rolAdmin = Rol::where('tenant_id', null)->where('nombre', 'admin')->firstOrFail();
        $rolVendedor = Rol::where('tenant_id', null)->where('nombre', 'vendedor')->firstOrFail();

        $admin = $this->crearUsuario(self::CORREO_ADMIN, 'Admin', $tenant->id, $sucursal->id);
        $this->asignarRol($admin, $rolAdmin);

        // Admin requiere 2FA obligatorio (Usuario::requiereDosFactor()) --
        // se pre-confirma aqui para que la cuenta funcione de punta a
        // punta sin pasar antes por la pantalla de configuracion de 2FA a
        // mano. El secreto nunca queda fijo en el codigo: se genera en
        // cada corrida y solo se imprime en consola (ver run() abajo).
        $twoFactor = app(TwoFactorService::class);
        $secreto = $twoFactor->generateSecretKey();
        $admin->forceFill([
            'two_factor_secret' => $secreto,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $twoFactor->generateRecoveryCodes(),
        ])->save();

        $vendedor = $this->crearUsuario(self::CORREO_VENDEDOR, 'Vendedor', $tenant->id, $sucursal->id);
        $this->asignarRol($vendedor, $rolVendedor);

        if (isset($this->command)) {
            $this->command->warn('DesarrolloSeeder: cuentas de PRUEBA. Nunca ejecutar este seeder en produccion.');
            $this->command->line('  admin@nucleo.test     / '.self::PASSWORD.'  (rol admin, 2FA ya confirmado)');
            $this->command->line('  vendedor@nucleo.test  / '.self::PASSWORD.'  (rol vendedor, sin 2FA)');
            $this->command->line('  Secreto TOTP del admin (agregalo a tu app de autenticacion para generar el codigo de 6 digitos que pide /login/2fa-verify):');
            $this->command->line('    '.$secreto);
            $this->command->line('  otpauth URI equivalente: '.$twoFactor->getOtpAuthUrl((string) config('app.name'), $admin->correo, $secreto));
        }
    }

    private function crearUsuario(string $correo, string $nombre, int $tenantId, int $sucursalId): Usuario
    {
        return Usuario::firstOrCreate(
            ['correo' => $correo],
            [
                'tenant_id' => $tenantId,
                'sucursal_id' => $sucursalId,
                'nombre' => $nombre,
                'apellido' => 'Desarrollo',
                'password' => self::PASSWORD,
                'activo' => true,
            ],
        );
    }

    private function asignarRol(Usuario $usuario, Rol $rol): void
    {
        if (! $usuario->roles()->where('rol_id', $rol->id)->exists()) {
            $usuario->roles()->attach($rol->id);
        }
    }
}
