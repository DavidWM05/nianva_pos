<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Huecos del contrato que quedaron de API-08b: el PUT de usuarios se documenta con la
 * rama de edicion de GuardarUsuarioRequest (password y roles opcionales) y el POST con la
 * del alta; meta.permisos de metodos de pago es un objeto de booleanos. Asi el frontend
 * los tipa desde el contrato, sin casts.
 */
class ContratoUsuariosMetodosPagoTest extends TestCase
{
    public function test_el_post_de_usuarios_exige_password_y_roles(): void
    {
        $requeridos = $this->camposRequeridos('/usuarios', 'post');

        $this->assertContains('password', $requeridos);
        $this->assertContains('roles', $requeridos);
        $this->assertContains('nombre', $requeridos);
        $this->assertContains('correo', $requeridos);
    }

    public function test_el_put_de_usuarios_no_exige_password_ni_roles(): void
    {
        $requeridos = $this->camposRequeridos('/usuarios/{usuario}', 'put');

        $this->assertNotContains('password', $requeridos);
        $this->assertNotContains('roles', $requeridos);
        $this->assertContains('nombre', $requeridos);
        $this->assertContains('correo', $requeridos);

        $propiedades = $this->esquemaDelCuerpo('/usuarios/{usuario}', 'put')['properties'] ?? [];
        $this->assertArrayHasKey('password', $propiedades, 'El PUT debe seguir documentando password como opcional.');
        $this->assertArrayHasKey('roles', $propiedades, 'El PUT debe seguir documentando roles como opcional.');
    }

    /** @return array<string, array{string}> */
    public static function rutasDeMetodosPago(): array
    {
        return [
            'listado' => ['/metodos-pago'],
            'detalle' => ['/metodos-pago/{metodoPago}'],
        ];
    }

    #[DataProvider('rutasDeMetodosPago')]
    public function test_meta_permisos_de_metodos_de_pago_es_objeto_de_booleanos(string $ruta): void
    {
        $esquema = $this->especificacion()['paths'][$ruta]['get']['responses']['200']['content']['application/json']['schema'] ?? null;
        $this->assertIsArray($esquema, "GET {$ruta}: sin esquema de respuesta 200.");

        // El listado con solo_activos responde sin meta: se toma la rama que si lo trae.
        $conMeta = collect($esquema['anyOf'] ?? [$esquema])
            ->first(fn (array $rama): bool => isset($rama['properties']['meta']));
        $this->assertIsArray($conMeta, "GET {$ruta}: ninguna rama documenta meta.");

        $permisos = $conMeta['properties']['meta']['properties']['permisos'] ?? null;
        $this->assertIsArray($permisos, "GET {$ruta}: meta.permisos no esta documentado.");
        $this->assertSame('object', $permisos['type'] ?? null, "GET {$ruta}: meta.permisos debe ser un objeto.");

        $tipos = isset($permisos['additionalProperties'])
            ? [$permisos['additionalProperties']]
            : array_values($permisos['properties'] ?? []);
        $this->assertNotEmpty($tipos, "GET {$ruta}: meta.permisos sin propiedades.");

        foreach ($tipos as $tipo) {
            $this->assertSame(['type' => 'boolean'], $tipo, "GET {$ruta}: cada permiso debe ser booleano.");
        }
    }

    /** @return list<string> */
    private function camposRequeridos(string $ruta, string $metodo): array
    {
        /** @var list<string> $requeridos */
        $requeridos = $this->esquemaDelCuerpo($ruta, $metodo)['required'] ?? [];

        return $requeridos;
    }

    /** @return array<string, mixed> */
    private function esquemaDelCuerpo(string $ruta, string $metodo): array
    {
        $especificacion = $this->especificacion();
        $esquema = $especificacion['paths'][$ruta][$metodo]['requestBody']['content']['application/json']['schema'] ?? null;
        $this->assertIsArray($esquema, strtoupper($metodo)." {$ruta}: sin cuerpo documentado.");

        if (isset($esquema['$ref'])) {
            $nombre = substr((string) $esquema['$ref'], strlen('#/components/schemas/'));
            $esquema = $especificacion['components']['schemas'][$nombre] ?? null;
            $this->assertIsArray($esquema, strtoupper($metodo)." {$ruta}: \$ref sin esquema.");
        }

        return $esquema;
    }

    /** @return array<string, mixed> */
    private function especificacion(): array
    {
        return json_decode(File::get(base_path('../docs/api/openapi.json')), true, 512, JSON_THROW_ON_ERROR);
    }
}
