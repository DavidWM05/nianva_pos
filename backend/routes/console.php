<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Revalidacion de licencias: SIEMPRE programada, nunca on-request (ver el
// docblock de RevalidarLicenciasCommand) -- el mismo bug que encontramos en
// el sistema PHP viejo de POS Ropa (una caida del servidor de licencias
// tumbaba el POS en vivo de cada cliente) se evita corriendo esto en
// background, con el periodo de gracia de LicenciaClienteService como red
// de seguridad si el servidor no responde.
Schedule::command('licencia:revalidar')->cron(config('licencias.revalidacion_cron', '0 3 * * *'));
