<?php

use App\Modules\Apartados\Providers\ApartadosServiceProvider;
use App\Modules\Auditoria\Providers\AuditoriaServiceProvider;
use App\Modules\Configuracion\Providers\ConfiguracionServiceProvider;
use App\Modules\Crm\Providers\CrmServiceProvider;
use App\Modules\Devoluciones\Providers\DevolucionesServiceProvider;
use App\Modules\Gastos\Providers\GastosServiceProvider;
use App\Modules\Inventario\Providers\InventarioServiceProvider;
use App\Modules\Nucleo\Providers\NucleoServiceProvider;
use App\Modules\Precios\Providers\PrecioServiceProvider;
use App\Modules\Tpv\Providers\TpvServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    NucleoServiceProvider::class,
    AuditoriaServiceProvider::class,
    InventarioServiceProvider::class,
    PrecioServiceProvider::class,
    CrmServiceProvider::class,
    TpvServiceProvider::class,
    ApartadosServiceProvider::class,
    DevolucionesServiceProvider::class,
    GastosServiceProvider::class,
    ConfiguracionServiceProvider::class,
];
