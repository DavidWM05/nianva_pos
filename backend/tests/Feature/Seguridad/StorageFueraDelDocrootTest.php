<?php

namespace Tests\Feature\Seguridad;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class StorageFueraDelDocrootTest extends TestCase
{
    private const PATRONES_PROHIBIDOS = [
        "Storage::disk('public')",
        'Storage::disk("public")',
        '->url(',
        "asset('storage",
        'Storage::url(',
    ];

    public function test_los_archivos_de_storage_no_se_sirven_por_http(): void
    {
        $archivos = [
            storage_path('app/public/prueba.txt'),
            storage_path('app/prueba.txt'),
        ];

        foreach ($archivos as $archivo) {
            File::ensureDirectoryExists(dirname($archivo));
            File::put($archivo, 'contenido privado');
        }

        try {
            $this->get('/storage/prueba.txt')->assertNotFound();
            $this->get('/storage/app/prueba.txt')->assertNotFound();
        } finally {
            File::delete($archivos);
        }
    }

    public function test_storage_link_no_publica_nada(): void
    {
        $this->assertSame([], config('filesystems.links'));
        $this->assertDirectoryDoesNotExist(public_path('storage'));
    }

    public function test_la_aplicacion_no_usa_el_disco_publico_ni_urls_de_storage(): void
    {
        foreach (File::allFiles(app_path()) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            $contenido = File::get($archivo->getPathname());

            foreach (self::PATRONES_PROHIBIDOS as $patron) {
                $this->assertStringNotContainsString(
                    $patron,
                    $contenido,
                    "El archivo {$archivo->getRelativePathname()} usa {$patron} (SEG-08).",
                );
            }
        }
    }
}
