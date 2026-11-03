# ui/format

Pipes de formato regional para las pantallas de Nianva. Todo valor monetario,
cantidad, porcentaje o fecha se muestra con estos pipes; no se usa `currency`,
`number` ni `date` de Angular.

## API

```ts
import { provideFormatoRegional } from '@nianva/ui-format';

provideFormatoRegional(); // es-MX, $, America/Mexico_City
provideFormatoRegional({ moneda: 'USD' });
```

El token `FORMATO_REGIONAL` expone `{ locale, moneda, zonaHoraria }`. En este
encargo la app usa los valores por defecto; conectarlo a la configuracion real
del tenant queda para el encargo de integracion.

| Pipe | Entrada | Salida |
|---|---|---|
| `dinero` | `1250.5` | `$1,250.50` |
| `dinero` | `-80` | `-$80.00` |
| `cantidad:'pza'` | `"1.000"` | `1 pza` |
| `cantidad:'kg'` | `0.5` | `0.5 kg` |
| `cantidad` | `0` | `0` |
| `porcentaje` | `16` | `16%` |
| `porcentaje` | `"7.50"` | `7.5%` |
| `fecha` | `2026-11-02` | `02/11/2026` |
| `fecha` | `2026-11-02T03:00:00.000000Z` | `01/11/2026` |
| `fechaHora` | `2026-11-02T03:00:00.000000Z` | `01/11/2026 21:00` |

`null`, `undefined`, vacio o un texto no numerico se muestran como `—`.
Las fechas con instante se convierten a la zona del tenant; una fecha sin hora
no se desplaza.
