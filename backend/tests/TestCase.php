<?php

namespace Tests;

use App\Modules\Nucleo\Services\FuenteConcesion;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;
use Tests\Support\FuenteConcesionTotal;

abstract class TestCase extends BaseTestCase
{
    private bool $omitirLlave = false;

    protected function setUp(): void
    {
        parent::setUp();
        config(['planes.entorno' => 'propio']);
        $this->app->bind(FuenteConcesion::class, FuenteConcesionTotal::class);
    }

    protected function seleccionarTerminalParaPrueba(int $terminalId): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->withHeader('Referer', 'http://localhost:4200/')
            ->withSession(['auth.terminal_id' => $terminalId])
            ->withCredentials()
            ->withCookie(session()->getName(), session()->getId());
    }

    protected function sinLlave(): static
    {
        $this->omitirLlave = true;

        return $this;
    }

    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        if (in_array(strtoupper($method), ['POST', 'PUT', 'PATCH'], true)) {
            $cabecera = 'HTTP_IDEMPOTENCY_KEY';
            if (! $this->omitirLlave && ! array_key_exists($cabecera, $server) && ! array_key_exists($cabecera, $this->serverVariables)) {
                $server[$cabecera] = (string) Str::ulid();
            }
            $this->omitirLlave = false;
        }

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
