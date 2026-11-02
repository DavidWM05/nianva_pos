<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class ControllersSinConsultasTest extends TestCase
{
    /**
     * Deuda conocida de ARQ-01. Solo baja: si un archivo deja de tener
     * consultas, hay que quitarlo de esta lista.
     *
     * @var array<string, string>
     */
    private const PENDIENTES = [
        'app/Modules/Apartados/Http/Controllers/ApartadoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Auditoria/Http/Controllers/AuditoriaController.php' => 'Pendiente ARQ-01',
        'app/Modules/Cotizaciones/Http/Controllers/CotizacionController.php' => 'Pendiente ARQ-01',
        'app/Modules/Crm/Http/Controllers/ClienteController.php' => 'Pendiente ARQ-01',
        'app/Modules/CrmAvanzado/Http/Controllers/CrmAvanzadoController.php' => 'Pendiente ARQ-01',
        'app/Modules/CuentasCobrar/Http/Controllers/CuentaCobrarController.php' => 'Pendiente ARQ-01',
        'app/Modules/CuentasPagar/Http/Controllers/CuentaPagarController.php' => 'Pendiente ARQ-01',
        'app/Modules/Delivery/Http/Controllers/PedidoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Devoluciones/Http/Controllers/DevolucionController.php' => 'Pendiente ARQ-01',
        'app/Modules/Gastos/Http/Controllers/GastoController.php' => 'Pendiente ARQ-01',
        'app/Modules/GiftCards/Http/Controllers/GiftCardController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/CategoriaController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/DepartamentoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/KardexController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/ProductoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/ProductoVarianteController.php' => 'Pendiente ARQ-01',
        'app/Modules/Inventario/Http/Controllers/ProveedorController.php' => 'Pendiente ARQ-01',
        'app/Modules/NotasCredito/Http/Controllers/NotaCreditoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Nucleo/Http/Controllers/DispositivosConfiablesController.php' => 'Pendiente ARQ-01',
        'app/Modules/Nucleo/Http/Controllers/MetodoPagoController.php' => 'Pendiente ARQ-01',
        'app/Modules/Nucleo/Http/Controllers/RolController.php' => 'Pendiente ARQ-01',
        'app/Modules/Nucleo/Http/Controllers/SucursalController.php' => 'Pendiente ARQ-01',
        'app/Modules/Nucleo/Http/Controllers/UsuarioController.php' => 'Pendiente ARQ-01',
        'app/Modules/Precios/Http/Controllers/CuponController.php' => 'Pendiente ARQ-01',
        'app/Modules/Precios/Http/Controllers/ReglaPrecioController.php' => 'Pendiente ARQ-01',
        'app/Modules/Produccion/Http/Controllers/ProduccionController.php' => 'Pendiente ARQ-01',
        'app/Modules/Tpv/Http/Controllers/VentaController.php' => 'Pendiente ARQ-01',
        'app/Modules/UnidadesMedida/Http/Controllers/UnidadMedidaController.php' => 'Pendiente ARQ-01',
    ];

    public function test_los_controllers_no_usan_consultas(): void
    {
        $infracciones = [];

        foreach ($this->archivosControladores() as $archivo) {
            $ruta = $this->rutaRelativa($archivo->getPathname());
            $contenido = File::get($archivo->getPathname());
            $consulta = preg_match('/\bDB::|::query\(|::where\(|::whereIn\(|->newQuery\(/', $contenido) === 1;
            $pendiente = array_key_exists($ruta, self::PENDIENTES);

            if ($consulta && ! $pendiente) {
                $infracciones[] = "{$ruta}: usa una consulta en el controller.";
            }

            if (! $consulta && $pendiente) {
                $infracciones[] = "{$ruta}: sigue en PENDIENTES pero ya no usa consultas.";
            }
        }

        foreach (array_keys(self::PENDIENTES) as $ruta) {
            if (! is_file(base_path($ruta))) {
                $infracciones[] = "{$ruta}: PENDIENTES apunta a un archivo inexistente.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<\SplFileInfo>
     */
    private function archivosControladores(): array
    {
        return collect(File::allFiles(app_path('Modules')))
            ->filter(fn (\SplFileInfo $archivo) => $archivo->getExtension() === 'php'
                && str_contains(str_replace('\\', '/', $archivo->getPathname()), '/Http/Controllers/'))
            ->values()
            ->all();
    }

    private function rutaRelativa(string $ruta): string
    {
        return str_replace('\\', '/', Str::after($ruta, base_path().DIRECTORY_SEPARATOR));
    }
}
