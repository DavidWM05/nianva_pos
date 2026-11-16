<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Support;

/**
 * ARQ-07: los perfiles de giro son datos (app/Modules/Configuracion/PerfilesGiro/*.php), no
 * codigo. Cada archivo define atributos con sus valores, unidades, categorias semilla y modulos
 * sugeridos. Configuracion solo los lee: crearlos en el catalogo es de App\Aplicacion.
 *
 * @phpstan-type Perfil array{clave: string, nombre: string, atributos: list<array{nombre: string, valores: list<string>}>, unidades: list<array{nombre: string, abreviatura: string, tipo: string}>, categorias: list<string>, modulos_sugeridos: list<string>}
 */
final class PerfilesGiro
{
    public const PREDETERMINADO = 'generico';

    /** @return list<Perfil> */
    public static function todos(): array
    {
        $perfiles = [];
        foreach (glob(dirname(__DIR__).'/PerfilesGiro/*.php') ?: [] as $archivo) {
            /** @var Perfil $perfil */
            $perfil = require $archivo;
            $perfiles[] = $perfil;
        }
        usort($perfiles, fn (array $a, array $b) => $a['clave'] === self::PREDETERMINADO ? -1 : ($b['clave'] === self::PREDETERMINADO ? 1 : strcmp($a['nombre'], $b['nombre'])));

        return $perfiles;
    }

    /** @return list<string> */
    public static function claves(): array
    {
        return array_map(fn (array $perfil) => $perfil['clave'], self::todos());
    }

    /** @return Perfil|null */
    public static function buscar(string $clave): ?array
    {
        foreach (self::todos() as $perfil) {
            if ($perfil['clave'] === $clave) {
                return $perfil;
            }
        }

        return null;
    }
}
