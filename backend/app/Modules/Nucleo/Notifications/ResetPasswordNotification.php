<?php

namespace App\Modules\Nucleo\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Reemplaza Illuminate\Auth\Notifications\ResetPassword: esa clase arma el
 * link hacia una ruta nombrada 'password.reset' del propio backend (una
 * vista Blade). Aqui el formulario que recibe el token vive en el frontend
 * Angular (frontend/apps/nucleo-shell), asi que el link apunta a
 * config('app.frontend_url').
 *
 * Se envia de forma sincrona (no ShouldQueue): en desarrollo, con
 * MAIL_MAILER=log, el correo debe aparecer en el log inmediatamente sin
 * depender de que haya un worker de colas corriendo.
 */
class ResetPasswordNotification extends Notification
{
    public function __construct(public readonly string $token)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/reset-password?token=%s&correo=%s',
            rtrim((string) config('app.frontend_url'), '/'),
            $this->token,
            urlencode($notifiable->getEmailForPasswordReset()),
        );

        return (new MailMessage)
            ->subject('Restablece tu contraseña')
            ->line('Recibimos una solicitud para restablecer la contraseña de tu cuenta.')
            ->action('Restablecer contraseña', $url)
            ->line('Este enlace expira en 60 minutos.')
            ->line('Si no solicitaste esto, puedes ignorar este correo.');
    }
}
