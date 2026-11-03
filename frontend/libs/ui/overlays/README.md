# @nianva/ui-overlays

`ui-modal` y `ui-drawer` encapsulan `p-dialog` y `p-drawer` para que las
pantallas no fijen anchos ni resuelvan la responsividad con `@media`.

```html
<ui-modal
  [(visible)]="modalVisible"
  titulo="Editar producto"
  tamano="md"
  (cerrado)="alCerrarModal()"
>
  <form [formGroup]="form">...</form>
  <button acciones type="button" (click)="guardar()">Guardar</button>
</ui-modal>

<ui-drawer
  [(visible)]="detalleVisible"
  titulo="Detalle de venta"
  tamano="lg"
  (cerrado)="alCerrarDetalle()"
>
  <p>Contenido del detalle</p>
</ui-drawer>
```

Ambos reciben `visible` (`model`), `titulo` y `tamano` (`sm`, `md`, `lg`), y
emiten `cerrado`. El contenido va por proyección; lo marcado con `acciones`
se coloca dentro de `ui-form-actions` en el pie. El modal ocupa la pantalla
completa y el drawer todo el ancho cuando `PantallaService.angosta()` es
verdadero. Se cierran con Escape o con el botón de cerrar.
