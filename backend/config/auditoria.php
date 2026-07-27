<?php

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;

return [
    /*
    |--------------------------------------------------------------------------
    | Modelos auditados
    |--------------------------------------------------------------------------
    |
    | Cualquier modelo Eloquent listado aqui queda auditado automaticamente
    | (create/update/delete escriben en auditoria) via Model::observe(),
    | registrado desde AuditoriaServiceProvider. Agregar auditoria a un
    | modelo de un modulo futuro es solo agregar su FQCN aqui -- no
    | requiere tocar ni el modelo ni el modulo Auditoria.
    |
    | Deliberadamente NO incluye ProductoVariante ni InventarioStock: el
    | volumen de movimientos (cada entrada/salida) haria la tabla de
    | auditoria enorme sin aportar mucho -- kardex ya es su historial.
    |
    | Cupon SI se incluye, aunque el pedido original de Precios sugeria
    | dejarlo fuera "por volumen/bajo riesgo": volumen-wise se parece mas a
    | reglas_precio (catalogo de baja frecuencia, no un log transaccional
    | como kardex) que a algo que vaya a inundar la tabla. Y a diferencia de
    | reglas_precio, un cupon puede circular publicamente (redes sociales,
    | promociones) -- saber quien cambio su valor/vigencia y cuando importa
    | para resolver disputas de clientes ("use el codigo X al 50%, ahora
    | dice 10%") y para detectar mal uso interno. Es una decision delegada
    | explicitamente por el usuario; si no aporta en la practica, se quita
    | de esta lista sin tocar el modelo ni el modulo Auditoria.
    |
    | Tampoco incluye PlanPagoClienteCuota: su propio estado (pendiente/
    | pagada/vencida) y fecha_pago ya documentan su historial relevante, y
    | son varias filas por plan -- mismo criterio de volumen que
    | ProductoVariante/InventarioStock.
    |
    | Venta SI se incluye (anular una venta, en particular, es exactamente
    | el tipo de evento que alguien querria poder auditar). VentaDetalle y
    | VentaPago NO: su propio registro -- una fila fija por linea/pago,
    | nunca editada despues de creada -- ya ES su historial, igual que
    | kardex para inventario_stock.
    |
    | CajaSesion SI se incluye: abrir/cerrar caja con una diferencia contra
    | el monto fisico es justo el tipo de evento que alguien querria poder
    | auditar despues (quien cerro, cuando, con que diferencia).
    |
    | Apartado SI se incluye: crear/cancelar un apartado (y el cambio de
    | estado al liquidar) es exactamente el tipo de evento de negocio que
    | alguien querria poder auditar despues, igual que Venta. Sus tablas
    | hijas (ApartadoDetalle, ApartadoAbono, ApartadoAbonoPago) NO -- mismo
    | criterio que VentaDetalle/VentaPago: cada fila es fija una vez creada
    | (un abono no se edita, se registra), asi que su propio registro ya ES
    | su historial.
    |
    | Devolucion SI se incluye: una devolucion o un cambio mueve dinero e
    | inventario (potencialmente hacia merma, una perdida), es justo el
    | tipo de evento de negocio auditable. DevolucionItem y DevolucionPago
    | NO -- mismo criterio que sus equivalentes en Tpv/Apartados: fila fija
    | desde su creacion.
    |
    | Gasto SI se incluye: es dinero saliendo de caja sin una venta de
    | contrapartida que ya lo documente (a diferencia de VentaDetalle o
    | DevolucionItem, un gasto no tiene ningun otro registro paralelo de su
    | propia historia) -- vale la pena el historial de auditoria completo.
    |
    | ConfiguracionTenant NO se incluye por ahora: moneda, mensaje de
    | ticket, logo, flags de que mostrar en el ticket -- datos de bajo
    | riesgo, no transaccionales. Si mas adelante se quiere rastrear quien
    | cambio la configuracion, es una linea agregarla aqui.
    |
    | Este archivo es la unica pieza de la app que conoce a Nucleo,
    | Auditoria, Inventario, Precios, Crm, Tpv, Apartados, Devoluciones,
    | Gastos y Configuracion a la vez; ninguno de esos modulos importa nada
    | de los otros directamente.
    */
    'auditables' => [
        Usuario::class,
        Rol::class,
        Producto::class,
        Compra::class,
        ReglaPrecio::class,
        Cupon::class,
        Cliente::class,
        PlanPagoCliente::class,
        Venta::class,
        CajaSesion::class,
        Apartado::class,
        Devolucion::class,
        Gasto::class,
    ],
];
