<?php

declare(strict_types=1);

$archivo = fopen($argv[1], 'wb');
if ($archivo === false || ! flock($archivo, LOCK_EX)) {
    throw new RuntimeException('No se pudo bloquear el canal de prueba.');
}
try {
    fwrite($archivo, '{"evento":');
    fflush($archivo);
    touch($argv[2]);
    // El padre observa la marca antes de pedir la lectura del canal bloqueado.
    usleep(500000);
    fwrite($archivo, "1}\n");
    fflush($archivo);
} finally {
    flock($archivo, LOCK_UN);
    fclose($archivo);
}
