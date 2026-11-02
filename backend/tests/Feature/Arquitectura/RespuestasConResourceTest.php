<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Return_;
use PhpParser\NodeFinder;
use PhpParser\ParserFactory;
use Tests\TestCase;

class RespuestasConResourceTest extends TestCase
{
    /**
     * Deuda conocida de API-02. Solo baja: el conteo es de response()->json
     * por archivo. Para listados, el patron correcto es:
     * XResource::collection($items)->additional(['meta' => [...]]).
     *
     * @var array<string, int>
     */
    private const PENDIENTES = [
        'app/Modules/Apartados/Http/Controllers/ApartadoController.php' => 3,
        'app/Modules/Auditoria/Http/Controllers/AuditoriaController.php' => 2,
        'app/Modules/Configuracion/Http/Controllers/ConfiguracionController.php' => 1,
        'app/Modules/Cotizaciones/Http/Controllers/CotizacionController.php' => 4,
        'app/Modules/Crm/Http/Controllers/ClienteController.php' => 3,
        'app/Modules/CrmAvanzado/Http/Controllers/CrmAvanzadoController.php' => 4,
        'app/Modules/CuentasCobrar/Http/Controllers/CuentaCobrarController.php' => 4,
        'app/Modules/CuentasPagar/Http/Controllers/CuentaPagarController.php' => 4,
        'app/Modules/Delivery/Http/Controllers/PedidoController.php' => 1,
        'app/Modules/Devoluciones/Http/Controllers/DevolucionController.php' => 2,
        'app/Modules/Gastos/Http/Controllers/GastoController.php' => 1,
        'app/Modules/GiftCards/Http/Controllers/GiftCardController.php' => 2,
        'app/Modules/Inventario/Http/Controllers/CategoriaController.php' => 3,
        'app/Modules/Inventario/Http/Controllers/CompraController.php' => 1,
        'app/Modules/Inventario/Http/Controllers/DepartamentoController.php' => 3,
        'app/Modules/Inventario/Http/Controllers/KardexController.php' => 1,
        'app/Modules/Inventario/Http/Controllers/ProductoController.php' => 2,
        'app/Modules/Inventario/Http/Controllers/ProveedorController.php' => 2,
        'app/Modules/NotasCredito/Http/Controllers/NotaCreditoController.php' => 2,
        'app/Modules/Nucleo/Http/Controllers/ConfiguracionSeguridadController.php' => 2,
        'app/Modules/Nucleo/Http/Controllers/DispositivosConfiablesController.php' => 1,
        'app/Modules/Nucleo/Http/Controllers/InicioController.php' => 1,
        'app/Modules/Nucleo/Http/Controllers/MetodoPagoController.php' => 3,
        'app/Modules/Nucleo/Http/Controllers/PasswordResetController.php' => 3,
        'app/Modules/Nucleo/Http/Controllers/PermisoController.php' => 1,
        'app/Modules/Nucleo/Http/Controllers/RolController.php' => 2,
        'app/Modules/Nucleo/Http/Controllers/SucursalController.php' => 1,
        'app/Modules/Nucleo/Http/Controllers/TwoFactorController.php' => 3,
        'app/Modules/Nucleo/Http/Controllers/UsuarioController.php' => 1,
        'app/Modules/Payroll/Http/Controllers/PayrollController.php' => 2,
        'app/Modules/Precios/Http/Controllers/CuponController.php' => 3,
        'app/Modules/Precios/Http/Controllers/ReglaPrecioController.php' => 2,
        'app/Modules/Prestamos/Http/Controllers/PrestamoController.php' => 2,
        'app/Modules/Produccion/Http/Controllers/ProduccionController.php' => 7,
        'app/Modules/Tpv/Http/Controllers/CajaController.php' => 2,
        'app/Modules/Tpv/Http/Controllers/VentaController.php' => 4,
        'app/Modules/UnidadesMedida/Http/Controllers/UnidadMedidaController.php' => 2,
        'app/Modules/VentasPlazos/Http/Controllers/PlanPagoController.php' => 3,
    ];

    /** @var array<string, string> */
    private const EXENTAS = [
        'app/Modules/Nucleo/Http/Controllers/AuthController.php' => 'Sesion web (routes/web.php), fuera de api/v1; no aplica el sobre de API.',
    ];

    public function test_los_controllers_responden_con_recursos(): void
    {
        $infracciones = [];

        foreach ($this->archivosControladores() as $archivo) {
            $ruta = $this->rutaRelativa($archivo->getPathname());
            $contenido = File::get($archivo->getPathname());
            $conteo = preg_match_all('/response\(\)->json\(/', $contenido);
            $esperado = self::PENDIENTES[$ruta] ?? 0;

            if (isset(self::EXENTAS[$ruta])) {
                if ($esperado > 0) {
                    $infracciones[] = "{$ruta}: esta en EXENTAS y en PENDIENTES.";
                }

                continue;
            }

            if ($conteo > $esperado) {
                $infracciones[] = "{$ruta}: usa response()->json {$conteo} veces; PENDIENTES dice {$esperado}.";
            } elseif ($conteo < $esperado) {
                $infracciones[] = "{$ruta}: bajo response()->json de {$esperado} a {$conteo}; actualiza PENDIENTES.";
            }

            foreach ($this->retornosDirectos($contenido) as $metodo) {
                $infracciones[] = "{$ruta}::{$metodo}: devuelve un arreglo o modelo directo desde una accion publica.";
            }
        }

        foreach (array_keys(self::PENDIENTES) as $ruta) {
            if (! is_file(base_path($ruta))) {
                $infracciones[] = "{$ruta}: PENDIENTES apunta a un archivo inexistente.";
            }
        }

        foreach (self::EXENTAS as $ruta => $razon) {
            if (! is_file(base_path($ruta)) || trim($razon) === '') {
                $infracciones[] = "{$ruta}: EXENTAS invalida.";
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

    /**
     * @return list<string>
     */
    private function retornosDirectos(string $contenido): array
    {
        $ast = (new ParserFactory)->createForHostVersion()->parse($contenido);
        $violaciones = [];

        if ($ast === null) {
            return $violaciones;
        }

        foreach ((new NodeFinder)->findInstanceOf($ast, ClassMethod::class) as $metodo) {
            if (! $metodo->isPublic()) {
                continue;
            }

            foreach ($this->retornosEn($metodo->stmts ?? []) as $retorno) {
                $expresion = $retorno->expr;

                if ($expresion instanceof Expr\Array_
                    || $expresion instanceof Expr\Variable
                    || ($expresion instanceof Expr\New_ && ! $this->esResource($expresion))) {
                    $violaciones[] = $metodo->name->toString();
                }
            }
        }

        return array_values(array_unique($violaciones));
    }

    /**
     * @param  array<int, Node>  $nodos
     * @return list<Return_>
     */
    private function retornosEn(array $nodos): array
    {
        $retornos = [];

        foreach ($nodos as $nodo) {
            if ($nodo instanceof Expr\Closure || $nodo instanceof Expr\ArrowFunction) {
                continue;
            }

            if ($nodo instanceof Return_) {
                $retornos[] = $nodo;

                continue;
            }

            foreach ($nodo->getSubNodeNames() as $nombre) {
                $hijo = $nodo->{$nombre};

                if ($hijo instanceof Node) {
                    $retornos = [...$retornos, ...$this->retornosEn([$hijo])];
                } elseif (is_array($hijo)) {
                    $retornos = [...$retornos, ...$this->retornosEn($hijo)];
                }
            }
        }

        return $retornos;
    }

    private function esResource(Expr\New_ $nueva): bool
    {
        if (! $nueva->class instanceof Name) {
            return false;
        }

        return preg_match('/(Resource|ResourceCollection)$/', $nueva->class->toString()) === 1;
    }
}
