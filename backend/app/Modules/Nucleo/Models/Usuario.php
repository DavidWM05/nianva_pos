<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Notifications\ResetPasswordNotification;
use App\Modules\Nucleo\Policies\UsuarioPolicy;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Notifications\Notification;

#[Fillable([
    'tenant_id', 'sucursal_id', 'nombre', 'apellido', 'alias', 'correo',
    'password', 'telefono', 'avatar_url', 'activo',
])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
#[UsePolicy(UsuarioPolicy::class)]
class Usuario extends Authenticatable
{
    use BelongsToTenant, Notifiable, SoftDeletes;

    protected $table = 'usuarios';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'ultimo_login' => 'datetime',
            'password' => 'hashed',
            // Encriptados (no texto plano) via los casts nativos de Eloquent --
            // el secreto TOTP y los codigos de recuperacion deben poder
            // desencriptarse (verificar un TOTP exige el secreto real, no un
            // hash de el), asi que 'encrypted', no 'hashed'.
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'usuario_roles')
            ->using(UsuarioRol::class)
            ->withPivot(['sucursal_id', 'created_at']);
    }

    public function esSuperadmin(): bool
    {
        return $this->tenant_id === null;
    }

    public function tieneRol(string $nombre): bool
    {
        return $this->roles()->where('nombre', $nombre)->exists();
    }

    public function tienePermiso(string $nombrePermiso): bool
    {
        if ($this->esSuperadmin()) {
            return true;
        }

        return $this->roles()
            ->whereHas('permisos', fn ($query) => $query->where('nombre', $nombrePermiso))
            ->exists();
    }

    /**
     * 2FA obligatorio (no se puede omitir) para admin y superadmin; opcional
     * para el resto. Ver EnsureTwoFactorIsConfigured, que bloquea rutas
     * protegidas mientras esto sea true y two_factor_confirmed_at siga null.
     */
    public function requiereDosFactor(): bool
    {
        return $this->esSuperadmin() || $this->tieneRol('admin');
    }

    /**
     * El broker de reset de contrasena de Laravel asume por defecto un
     * atributo 'email' -- nuestra columna es 'correo'.
     */
    public function getEmailForPasswordReset(): string
    {
        return $this->correo;
    }

    public function routeNotificationForMail(?Notification $notification = null): string
    {
        return $this->correo;
    }

    /**
     * Notificacion propia (no la de Laravel por defecto): el link debe
     * apuntar al formulario del frontend Angular, no a una ruta/vista
     * Blade del backend.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
