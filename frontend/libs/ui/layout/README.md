# @nianva/ui-layout

Estructura de las páginas: encabezado, cuerpo con sus estados de carga y secciones (UI-08, UI-18).

| Pieza | Uso |
|---|---|
| `EntradaNavegacion`, `REGISTRO_NAVEGACION` | El registro de navegación: `clave`, `ruta`, `nombre`, `icono` y, opcionales, `permiso` y `feature`. La app lo provee (en `pos`, `REGISTRO_NAVEGACION_POS` de `modules.config.ts`) |
| `problemaDeNombre()` | Comprueba UI-08: mayúscula solo al inicio, sin "Gestión de"; las siglas se permiten |
| `<ui-page-header clave="crm" subtitulo="…">` | Nombre e icono sacados del registro. No acepta un título: el nombre no se escribe a mano. Las acciones van con el atributo `acciones` |
| `<ui-page [estado]="estado()" forma="listado" (reintentar)="cargar()">` | `cargando` muestra un skeleton con la forma (`listado`, `detalle`, `formulario`), `error` muestra el mensaje con "Reintentar" y `listo` muestra el contenido |
| `<ui-section titulo="Datos generales">` | Bloque con título dentro de una página |
| `<ui-form-actions>` | Botones al pie de un formulario, alineados a la derecha |
| `<ui-shell>` | Marco de la app autenticada: `menu` (fijo en ancha, panel en angosta), `encabezado` y, a la derecha del encabezado, `acciones` (por ejemplo, el menú de usuario de la app). No conoce usuario ni tema |
| `<ui-migas [migas]="migas">` | Ruta de navegación: `nav` con nombre accesible y lista ordenada; cada `Miga` (`etiqueta`, `ruta`, `icono` opcional) es un enlace menos la última, que lleva `aria-current="page"`. La app arma las migas |

Ejemplo:

```html
<ui-page-header clave="crm" subtitulo="Personas y empresas que te compran">
  <ui-btn-crear acciones objeto="cliente" ruta="/crm/nuevo" />
</ui-page-header>

<ui-page [estado]="estado()" forma="listado" (reintentar)="cargar()">
  ...
</ui-page>
```
