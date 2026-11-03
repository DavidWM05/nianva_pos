# @nianva/ui-feedback

Estados, mensajes y estados de carga de la interfaz (UI-06, UI-13 y UI-18).

| Pieza | Uso |
|---|---|
| `REGISTRO_ESTADOS`, `estadoVisual()` | Un registro `estado → { etiqueta, tono, icono }` por entidad. El valor por defecto de la columna `estado` es el normal y no lleva badge. Un test lo compara con los enums de las migraciones del backend |
| `<ui-badge entidad="venta" [estado]="venta.estado" />` | Badge de estado sacado del registro |
| `ToastService` + `<nucleo-toast-host />` | El canal único de toasts. El mismo mensaje dentro de 1.5 s se muestra una sola vez. `@nianva/ui-shared` lo reexporta |
| `<ui-skeleton forma="texto" [lineas]="3" />` | Marcador con la forma del contenido mientras carga: `texto`, `bloque` o `circulo`, con `ancho` y `alto` |
| `conUmbral(señal, ms = 300)` | Retrasa el encendido de un indicador para que no parpadee en respuestas rápidas; se apaga en el acto |

Ejemplo de un botón que envía:

```ts
protected readonly enviando = signal(false);
protected readonly indicadorEnvio = conUmbral(this.enviando);
```

```html
<p-button label="Guardar" [disabled]="enviando()" [loading]="indicadorEnvio()" />
```

La regla `nianva/sin-texto-cargando` prohíbe los textos "Cargando…" o "Generando…" en
plantillas. Los archivos que aún los tienen están en
`tools/eslint-rules/cargando-pendientes.json`, una lista que solo baja.
