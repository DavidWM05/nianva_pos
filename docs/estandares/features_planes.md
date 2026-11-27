# Contrato de features del POS instalado

La concesión por tenant usa `plan_codigo` para presentación, `features` para autorización y `cuotas` con totales efectivos de `terminales` y `sucursales`. Una feature ausente o desconocida se descarta. Un código de plan a medida puede usar cualquier combinación de los slugs ofertados. El servidor cruza las features con preferencias de módulos y permisos.

| Slug | Plan mínimo | Rutas, módulos y permisos |
| --- | --- | --- |
| `tpv` | Básico | `/ventas` e impresos de venta, permisos `ventas.*`. |
| `catalogo` | Básico | Productos, categorías, departamentos, atributos y unidades, permisos `inventario.*` y de unidades. |
| `caja` | Básico | Apertura y corte normal, gasto e impresos, permisos `caja.*` y `gastos.*`. |
| `inventario` | Básico | Variantes, presentaciones, kardex y ajustes, permisos `inventario.*`. |
| `compras_proveedores` | Básico | `/compras`, `/proveedores` y sus permisos. |
| `devoluciones` | Básico | `/devoluciones` y sus permisos. |
| `reportes` | Básico | `/inicio/resumen`, `/ventas/reporte`, `reportes.ver` y `reportes.costos` para utilidad y margen. |
| `administracion` | Básico | Usuarios, roles y auditoría, con sus permisos habituales. |
| `multicaja` | Avanzado | `/caja/remotas` y `/caja/consolidado`, permiso `caja.cerrar_remota` y PIN cuando corresponde. |
| `clientes` | Avanzado | Catálogo de clientes e historial por cliente, permisos `clientes.*`. TPV usa Público General cuando falta esta feature. |
| `apartados` | Avanzado | `/apartados`, administración, abonos e impresos, permisos `apartados.*`. |
| `cupones_promociones_mayoreo` | Avanzado | `/cupones`, `/reglas-precio`, permisos de cupones y reglas, cálculo de ofertas en la cotización de venta. |
| `credito_clientes` | Avanzado | Módulo `cxc`, rutas de cuentas por cobrar, permisos `cuentas_cobrar.*` y `reportes_cuentas_cobrar.ver`. |
| `cotizaciones` | Avanzado | Módulo del mismo nombre, rutas y permisos `cotizaciones.*`. |
| `notas_credito` | Avanzado | Módulo del mismo nombre, permisos `notas_credito.*` y aplicación en TPV. |
| `gift_cards` | Avanzado | Módulo del mismo nombre, permisos `gift_cards.*` y aplicación en TPV. |
| `reportes_csv` | Avanzado | Endpoints `/reporte/exportar`, permiso del reporte y `reportes.exportar`. |
| `cxp` | Pro | Módulo `cxp`, permisos `cuentas_pagar.*` y `reportes_cuentas_pagar.ver`. |
| `ventas_plazos` | Pro | Módulo del mismo nombre, rutas y permisos `ventas_plazos.*`. |
| `produccion` | Pro | Módulo del mismo nombre, rutas y permisos `produccion.*`. |
| `multisucursal` | Pro en entorno propio | Alta de sucursales adicionales por el servicio de aprovisionamiento, con su cuota. |

CRM avanzado, Delivery, Nómina y Préstamos quedan fuera de la oferta. Sus slugs `crm_avanzado`, `delivery`, `payroll` y `prestamos` son válidos en concesiones explícitas. El catálogo comercial del POS los excluye.

S1 toma la concesión temporal de `planes.concesiones`, con clave del tenant. Si falta una asignación por tenant, consulta `planes.instalacion`, que admite la concesión en JSON mediante `POS_CONCESION_INSTALACION`. Ejemplo para entorno propio con dos sucursales contratadas y dos terminales adicionales:

```php
42 => [
    'plan_codigo' => 'pro',
    'features' => ['tpv', 'catalogo', 'caja', 'multicaja', 'multisucursal'],
    'cuotas' => ['terminales' => 12, 'sucursales' => 2],
],
```

El ejemplo es una concesión parcial. Sin asignación se aplica Básico. El catálogo comercial concede 1/1 en Básico, 3/1 en Avanzado y una bolsa Pro de `5 × sucursales contratadas + terminales adicionales`. Escritorio y LAN se limitan a una sucursal. Los usuarios son ilimitados.

La cuota se serializa por tenant. Ante una baja de plan, las cajas abiertas conservan operación y corte. Nuevas aperturas se rechazan con `limite_plan_excedido` mientras el uso supere el máximo. Alta y reactivación se rechazan al llegar al máximo. El contexto incluye recurso, operación, límite y uso.
