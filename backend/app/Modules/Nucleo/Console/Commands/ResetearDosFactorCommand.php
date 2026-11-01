<?php

namespace App\Modules\Nucleo\Console\Commands;

use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Reseteo de emergencia para un usuario que perdio el telefono y los codigos
 * de recuperacion. Solo lo puede ejecutar quien tiene acceso al servidor;
 * la confirmacion es para evitar un reset accidental, no una autorizacion.
 *
 * No escribe auditoria a mano: Usuario es auditable y el save() deja la
 * fila de auditoria via AuditObserver.
 */
class ResetearDosFactorCommand extends Command
{
    protected $signature = 'usuarios:resetear-2fa
        {correo : Correo del usuario}
        {--force : No pedir confirmacion}';

    protected $description = 'Resetea el 2FA de un usuario que perdio el telefono y los codigos de recuperacion.';

    public function handle(TrustedDeviceService $trustedDeviceService): int
    {
        $correo = (string) $this->argument('correo');
        $usuario = Usuario::sinTenant()->where('correo', $correo)->first();

        if (! $usuario instanceof Usuario) {
            $this->error("No existe un usuario con el correo {$correo}.");

            return self::FAILURE;
        }

        $tenant = $usuario->tenant()->first();
        $nombreTenant = $tenant === null ? 'Sin tenant (superadmin)' : (string) $tenant->getAttribute('nombre');
        $correoUsuario = (string) $usuario->getAttribute('correo');
        $nombreUsuario = (string) $usuario->getAttribute('nombre');

        $this->line("Usuario: {$correoUsuario}");
        $this->line("Nombre: {$nombreUsuario}");
        $this->line("Tenant: {$nombreTenant}");

        if (! $this->option('force')
            && ! $this->confirm('¿Resetear la autenticacion en dos pasos de este usuario?')
        ) {
            $this->warn('Reseteo cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($usuario, $trustedDeviceService): void {
            $usuario->forceFill([
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
            ])->save();

            $trustedDeviceService->revocarTodos($usuario);

            if (config('session.driver') === 'database') {
                DB::table((string) config('session.table', 'sessions'))
                    ->where('user_id', $usuario->getKey())
                    ->delete();
            }
        });

        $this->info("2FA reseteado para {$correoUsuario}.");

        return self::SUCCESS;
    }
}
