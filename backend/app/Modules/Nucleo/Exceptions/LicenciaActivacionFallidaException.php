<?php

namespace App\Modules\Nucleo\Exceptions;

use RuntimeException;

/**
 * A diferencia de revalidar() (que tiene el periodo de gracia como red de
 * seguridad, ver LicenciaClienteService), activar() nunca tiene un estado
 * previo del cual caer hacia atras -- si el servidor de licencias no
 * responde o rechaza la activacion, no hay nada que "seguir funcionando
 * con el ultimo estado conocido", asi que esto se propaga como error duro.
 * Solo la usa licencia:activar (CLI) hoy -- no esta mapeada a un error_code
 * HTTP en bootstrap/app.php porque no se lanza desde ningun Controller.
 */
class LicenciaActivacionFallidaException extends RuntimeException {}
