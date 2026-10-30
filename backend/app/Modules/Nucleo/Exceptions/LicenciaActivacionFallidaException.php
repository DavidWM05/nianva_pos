<?php

namespace App\Modules\Nucleo\Exceptions;

use RuntimeException;

/**
 * A diferencia de revalidar() (que tiene el periodo de gracia como red de
 * seguridad, ver LicenciaClienteService), activar() nunca tiene un estado
 * previo del cual caer hacia atras -- si el servidor de licencias no
 * responde o rechaza la activacion, no hay nada que "seguir funcionando
 * con el ultimo estado conocido", asi que esto se propaga como error duro.
 * Solo la usa licencia:activar (CLI) hoy -- no se lanza desde ningun
 * Controller, por eso no extiende ExcepcionNegocio ni declara un error_code
 * HTTP.
 */
class LicenciaActivacionFallidaException extends RuntimeException {}
