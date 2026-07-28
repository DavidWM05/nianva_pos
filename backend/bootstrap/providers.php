<?php

use App\Modules\Apartados\Providers\ApartadosServiceProvider;
use App\Modules\Auditoria\Providers\AuditoriaServiceProvider;
use App\Modules\Configuracion\Providers\ConfiguracionServiceProvider;
use App\Modules\Cotizaciones\Providers\CotizacionesServiceProvider;
use App\Modules\CrmAvanzado\Providers\CrmAvanzadoServiceProvider;
use App\Modules\CuentasCobrar\Providers\CuentasCobrarServiceProvider;
use App\Modules\CuentasPagar\Providers\CuentasPagarServiceProvider;
use App\Modules\Crm\Providers\CrmServiceProvider;
use App\Modules\Delivery\Providers\DeliveryServiceProvider;
use App\Modules\GiftCards\Providers\GiftCardsServiceProvider;
use App\Modules\NotasCredito\Providers\NotasCreditoServiceProvider;
use App\Modules\Payroll\Providers\PayrollServiceProvider;
use App\Modules\Prestamos\Providers\PrestamosServiceProvider;
use App\Modules\Produccion\Providers\ProduccionServiceProvider;
use App\Modules\Devoluciones\Providers\DevolucionesServiceProvider;
use App\Modules\Gastos\Providers\GastosServiceProvider;
use App\Modules\Inventario\Providers\InventarioServiceProvider;
use App\Modules\Nucleo\Providers\NucleoServiceProvider;
use App\Modules\Precios\Providers\PrecioServiceProvider;
use App\Modules\Tpv\Providers\TpvServiceProvider;
use App\Modules\UnidadesMedida\Providers\UnidadesMedidaServiceProvider;
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
    CotizacionesServiceProvider::class,
    CrmAvanzadoServiceProvider::class,
    CuentasCobrarServiceProvider::class,
    CuentasPagarServiceProvider::class,
    DeliveryServiceProvider::class,
    GiftCardsServiceProvider::class,
    NotasCreditoServiceProvider::class,
    PayrollServiceProvider::class,
    PrestamosServiceProvider::class,
    ProduccionServiceProvider::class,
    UnidadesMedidaServiceProvider::class,
];
