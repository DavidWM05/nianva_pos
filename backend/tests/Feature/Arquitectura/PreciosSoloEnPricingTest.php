<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class PreciosSoloEnPricingTest extends TestCase
{
    /** @var array<string, string> Catálogo: declarar, editar o mostrar un precio no es cobrarlo. */
    private const CATALOGO = [
        'Modules/Inventario/Models/Producto.php' => 'Atributo persistido y cast decimal del catálogo.',
        'Modules/Inventario/Http/Resources/ProductoResource.php' => 'Expone el precio del catálogo; no calcula cobros.',
        'Modules/Inventario/Dtos/ProductoDto.php' => 'Transporta el precio al guardar el catálogo.',
        'Modules/Inventario/Http/Requests/GuardarProductoRequest.php' => 'Valida y tipa el precio editado en el catálogo.',
        'Modules/Inventario/Http/Controllers/ProductoController.php' => 'Permite ordenar el catálogo por su precio.',
        'Modules/Inventario/Database/Factories/ProductoFactory.php' => 'Genera precios de productos para fixtures.',
        'Modules/Inventario/Database/Migrations/2026_07_21_000004_create_productos_table.php' => 'Define la columna del precio en el esquema.',
    ];

    /** @var array<string, array{razon:string, usos:int}> Solo baja; un pendiente sin usos también falla. */
    private const PENDIENTES = [];

    public function test_el_precio_de_cobro_y_el_servicio_anterior_no_se_usan_fuera_de_precios(): void
    {
        $infracciones = [];
        $usosPorArchivo = [];
        foreach (File::allFiles(app_path()) as $archivo) {
            $ruta = str_replace('\\', '/', substr($archivo->getPathname(), strlen(app_path()) + 1));
            if ($archivo->getExtension() !== 'php' || str_starts_with($ruta, 'Modules/Precios/')) {
                continue;
            }
            $codigo = '';
            foreach (token_get_all(File::get($archivo->getPathname())) as $token) {
                $codigo .= is_array($token) ? (in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true) ? ' ' : $token[1]) : $token;
            }
            $lecturas = preg_match_all('/\bprecio_venta\b/', $codigo);
            $servicioAnterior = preg_match_all('/\bPrecioService\b/', $codigo);
            $usos = (isset(self::CATALOGO[$ruta]) ? 0 : $lecturas) + $servicioAnterior;
            $usosPorArchivo[$ruta] = $usos;
            $permitidos = self::PENDIENTES[$ruta]['usos'] ?? 0;
            if ($usos !== $permitidos) {
                $infracciones[] = $ruta.': '.$usos.' usos fuera de PricingService (precio_venta='.$lecturas.', PrecioService='.$servicioAnterior.'); PENDIENTES permite '.$permitidos.'.';
            }
        }
        foreach (self::PENDIENTES as $ruta => $pendiente) {
            if (($usosPorArchivo[$ruta] ?? 0) === 0 || trim($pendiente['razon']) === '') {
                $infracciones[] = $ruta.': pendiente obsoleto o sin razón; retíralo.';
            }
        }
        foreach (self::CATALOGO as $ruta => $razon) {
            if (! is_file(app_path($ruta)) || trim($razon) === '') {
                $infracciones[] = $ruta.': CATALOGO requiere un archivo existente y su razón.';
            }
        }
        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
