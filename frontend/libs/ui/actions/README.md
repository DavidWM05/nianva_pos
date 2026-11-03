# @nianva/ui-actions

Acciones de pagina y de fila (UI-07). Los componentes fijan etiqueta, icono, tono y orden;
las pantallas solo declaran el tipo de accion.

```html
<ui-btn-crear objeto="producto" (crear)="crear()" />
<ui-btn-crear objeto="orden" genero="f" ruta="/ordenes/nuevo" />
<ui-btn-exportar [exportando]="exportando()" (exportar)="exportar()" />

<ui-row-actions
  [acciones]="[
    { tipo: 'ver' },
    { tipo: 'editar', motivoDeshabilitada: 'Solo lectura' },
    { tipo: 'estado', activo: true },
    { tipo: 'eliminar' },
  ]"
  (accion)="ejecutar($event)"
/>
```

`ui-row-actions` no acepta texto visible: las acciones estandar usan su etiqueta fija y las
`custom` reciben `descripcion`, que solo se usa en `title`/`aria-label`. Con mas de tres
acciones muestra dos iconos y el resto en el menu de mas acciones. No confirma acciones
destructivas; eso queda en la pantalla (UI-13).
