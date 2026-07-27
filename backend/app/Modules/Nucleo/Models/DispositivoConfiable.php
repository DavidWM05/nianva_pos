<?php

namespace App\Modules\Nucleo\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un dispositivo que ya paso el segundo factor y puede omitirlo en logins
 * subsecuentes mientras la cookie firmada siga vigente (ver
 * TrustedDeviceService). identificador_dispositivo guarda el HASH del
 * token, nunca el token en claro -- igual que remember_token, un dump de
 * la base de datos no alcanza para suplantar un dispositivo.
 */
#[Fillable(['usuario_id', 'identificador_dispositivo', 'user_agent', 'ip_registro', 'fecha_creacion', 'fecha_expiracion'])]
class DispositivoConfiable extends Model
{
    public $timestamps = false;

    protected $table = 'dispositivos_confiables';

    protected function casts(): array
    {
        return [
            'fecha_creacion' => 'datetime',
            'fecha_expiracion' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
