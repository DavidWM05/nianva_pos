# @nianva/ui-report

Plantilla de reporte (UI-10): filtros, KPI, gráfica opcional y detalle. No
calcula cifras; recibe las métricas ya hechas desde la capa de métricas.

```html
<ui-report
  clave="reportes"
  [estado]="estado()"
  [exportando]="exportando()"
  (exportar)="exportar()"
  (reintentar)="cargar()"
>
  <ui-report-filtros
    filtros
    [sucursales]="sucursales()"
    [puedeElegirSucursal]="puedeElegirSucursal()"
    [sucursalUsuario]="sucursalUsuario()"
    (cambio)="cargar($event)"
    (limpiar)="limpiar()"
  />

  <div kpis class="reporte__kpis">
    <ui-kpi etiqueta="Ventas" [valor]="ventas()" formato="dinero" [variacion]="variacionVentas()" />
    <ui-kpi etiqueta="Tickets" [valor]="tickets()" formato="cantidad" unidad="ticket" />
  </div>

  <div grafica class="reporte__grafica">
    <!-- La librería de gráficas se integra en la Fase 6. -->
  </div>

  <ui-tabla
    detalle
    [columnas]="columnas"
    [filas]="filas()"
    [meta]="meta()"
    [totales]="totales()"
    (cambio)="cargar($event)"
  />
</ui-report>
```

`ui-report-filtros` recibe `sucursales: { id, nombre }[]`, `puedeElegirSucursal`
y, opcionalmente, `sucursalUsuario`. Sin permiso muestra la sucursal del
usuario como texto; con permiso muestra `ui-select-filtro` con “Todas”. El
rango de fechas se emite como `YYYY-MM-DD` sin desplazamiento de zona.

`ui-report` proyecta `[filtros]`, `[kpis]`, `[grafica]` y `[detalle]`. Si no
se proyecta `[grafica]`, no queda contenedor vacío. El botón Exportar usa
`ui-btn-exportar`; los estados de carga y error los resuelve `ui-page` con
skeleton de listado y “Reintentar”.
