import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const temas = ['claro', 'oscuro'] as const;
const anchos = [375, 768, 1280] as const;

const ESTILO_DE_CAPTURA = `
  ui-shell, .ui-shell, .ui-shell__menu { height: auto !important; }
  .ui-shell__contenido { overflow: visible !important; }
  #p-license-host { display: none !important; }
`;

for (const tema of temas) {
  for (const ancho of anchos) {
    test(`captura material ${tema} ${ancho}`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto(`/material?tema=${tema}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('cat-root')).toBeVisible();
      await page.addStyleTag({ content: ESTILO_DE_CAPTURA });

      await expect(page).toHaveScreenshot(`catalogo-material-${tema}-${ancho}.png`, {
        fullPage: true,
      });
    });
  }
}

for (const tema of temas) {
  test(`axe material ${tema}`, async ({ page }) => {
    await page.goto(`/material?tema=${tema}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const violaciones = resultado.violations.filter(
      (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical',
    );

    expect(
      violaciones.map((violacion) => ({
        id: violacion.id,
        impacto: violacion.impact,
        selectores: violacion.nodes.map((nodo) => nodo.target),
      })),
    ).toEqual([]);
  });
}

for (const ancho of anchos) {
  test(`material sin desborde ${ancho}`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/material?tema=claro');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const medidas = await page.evaluate(() => {
      const main = document.querySelector('main');

      return {
        mainScrollWidth: main?.scrollWidth ?? 0,
        mainClientWidth: main?.clientWidth ?? 0,
      };
    });

    expect(
      medidas.mainScrollWidth,
      `material a ${ancho}px: main ${medidas.mainScrollWidth}px > ${medidas.mainClientWidth}px`,
    ).toBeLessThanOrEqual(medidas.mainClientWidth);
  });
}

test('material tiene foco visible con Tab', async ({ page }) => {
  await page.goto('/material?tema=claro');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('cat-root')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).click();

  const sinIndicador: string[] = [];

  for (let indice = 0; indice < 30; indice += 1) {
    await page.keyboard.press('Tab');
    const elemento = await page.evaluate(() => {
      const activo = document.activeElement as HTMLElement | null;

      if (!activo || activo === document.body) {
        return null;
      }

      const estilo = getComputedStyle(activo);

      return {
        descripcion: `${activo.tagName.toLowerCase()} ${activo.getAttribute('aria-label') ?? activo.textContent?.trim().slice(0, 30) ?? ''}`,
        outlineStyle: estilo.outlineStyle,
        outlineWidth: estilo.outlineWidth,
        boxShadow: estilo.boxShadow,
      };
    });

    if (
      elemento
      && ! ((elemento.outlineStyle !== 'none' && elemento.outlineWidth !== '0px') || elemento.boxShadow !== 'none')
    ) {
      sinIndicador.push(elemento.descripcion);
    }
  }

  expect(sinIndicador).toEqual([]);
});

function parsearRgb(color: string): [number, number, number, number] {
  const valores = color.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r = 0, g = 0, b = 0, a = 1] = valores;

  return [r, g, b, a];
}

function luminancia(rgb: [number, number, number, number]): number {
  const canales = rgb.slice(0, 3).map((canal) => {
    const normalizado = canal / 255;

    return normalizado <= 0.03928 ? normalizado / 12.92 : ((normalizado + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(fondo: string, texto: string): number {
  const [fr, fg, fb] = parsearRgb(fondo);
  const [tr, tg, tb, ta] = parsearRgb(texto);
  const fondoRgb: [number, number, number, number] = [fr, fg, fb, 1];
  const textoRgb: [number, number, number, number] = [
    tr * ta + fr * (1 - ta),
    tg * ta + fg * (1 - ta),
    tb * ta + fb * (1 - ta),
    1,
  ];
  const uno = luminancia(fondoRgb);
  const dos = luminancia(textoRgb);

  return (Math.max(uno, dos) + 0.05) / (Math.min(uno, dos) + 0.05);
}

// El velo de estado de Material (state layer, un ::before sobre el boton) tomaba el color del
// texto: con foco aclaraba el primario bajo texto blanco (4.17:1, #ffffff sobre #3f76ed) y axe
// lo marco en configuracion.spec.ts de pos, en CI. axe no siempre mide un pseudo-elemento, asi
// que aqui se compone el velo sobre el fondo y se mide el contraste directo.
test('el boton relleno conserva contraste con foco y con el puntero encima en ambos temas', async ({ page }) => {
  const fallos: string[] = [];

  for (const tema of temas) {
    await page.goto(`/material?tema=${tema}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();
    // La pagina abre un dialogo de muestra al cargar.
    await page.getByRole('button', { name: 'Cerrar' }).click();

    const boton = page.getByRole('button', { name: 'Filled', exact: true });
    const estados = [
      { nombre: 'foco', preparar: async () => boton.focus() },
      { nombre: 'foco y puntero', preparar: async () => boton.hover() },
      { nombre: 'puntero', preparar: async () => boton.evaluate((b) => b.blur()) },
    ];

    for (const estado of estados) {
      await estado.preparar();
      // Material anima el velo; se mide cuando termina la transicion.
      await page.waitForTimeout(300);

      const colores = await boton.evaluate((elemento) => {
        const capa = elemento.querySelector('.mat-mdc-button-persistent-ripple');
        const velo = capa ? getComputedStyle(capa, '::before') : null;
        const etiqueta = elemento.querySelector('.mdc-button__label') ?? elemento;

        return {
          fondo: getComputedStyle(elemento).backgroundColor,
          velo: velo?.backgroundColor ?? 'rgba(0, 0, 0, 0)',
          opacidad: Number(velo?.opacity ?? 0),
          texto: getComputedStyle(etiqueta).color,
        };
      });

      const [fr, fg, fb] = parsearRgb(colores.fondo);
      const [vr, vg, vb] = parsearRgb(colores.velo);
      const o = colores.opacidad;
      const compuesto = `rgb(${fr * (1 - o) + vr * o}, ${fg * (1 - o) + vg * o}, ${fb * (1 - o) + vb * o})`;
      const ratio = contraste(compuesto, colores.texto);

      if (ratio < 4.5) {
        fallos.push(`${tema}, ${estado.nombre}: ${colores.texto} sobre ${compuesto} = ${ratio.toFixed(2)}:1`);
      }
    }
  }

  expect(fallos).toEqual([]);
});

// La onda del clic (ripple, un elemento real) tambien tomaba el color del texto del boton: blanco
// al 12% sobre el primario, el mismo #3f76ed (4.17:1). En CI, mas lento, la onda seguia visible
// cuando axe media configuracion.spec.ts de pos; en local ya se habia desvanecido.
test('el boton relleno conserva contraste mientras se presiona en ambos temas', async ({ page }) => {
  const fallos: string[] = [];

  // color-mix() se resuelve como color(srgb r g b / a), con canales de 0 a 1.
  const aRgba = (color: string): [number, number, number, number] => {
    if (color.startsWith('color(srgb')) {
      const [r = 0, g = 0, b = 0, a = 1] = color.match(/[\d.]+/g)?.map(Number) ?? [];

      return [r * 255, g * 255, b * 255, a];
    }

    return parsearRgb(color);
  };

  for (const tema of temas) {
    await page.goto(`/material?tema=${tema}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();
    // La pagina abre un dialogo de muestra al cargar.
    await page.getByRole('button', { name: 'Cerrar' }).click();

    const boton = page.getByRole('button', { name: 'Filled', exact: true });
    await boton.hover();
    // Con el boton presionado la onda se queda visible.
    await page.mouse.down();
    await expect(boton.locator('.mat-ripple-element').first()).toBeAttached();
    await page.waitForTimeout(400);

    const colores = await boton.evaluate((elemento) => {
      const onda = elemento.querySelector('.mat-ripple-element');
      const etiqueta = elemento.querySelector('.mdc-button__label') ?? elemento;

      return {
        fondo: getComputedStyle(elemento).backgroundColor,
        onda: onda ? getComputedStyle(onda).backgroundColor : 'rgba(0, 0, 0, 0)',
        opacidadOnda: Number(onda ? getComputedStyle(onda).opacity : 0),
        texto: getComputedStyle(etiqueta).color,
      };
    });
    await page.mouse.up();

    const [fr, fg, fb] = parsearRgb(colores.fondo);
    const [or, og, ob, oa] = aRgba(colores.onda);
    const o = oa * colores.opacidadOnda;
    const compuesto = `rgb(${fr * (1 - o) + or * o}, ${fg * (1 - o) + og * o}, ${fb * (1 - o) + ob * o})`;
    const ratio = contraste(compuesto, colores.texto);

    if (ratio < 4.5) {
      fallos.push(`${tema}: ${colores.texto} sobre ${compuesto} (onda ${colores.onda}) = ${ratio.toFixed(2)}:1`);
    }
  }

  expect(fallos).toEqual([]);
});

test('el input deshabilitado de Material conserva contraste en ambos temas', async ({ page }) => {
  for (const tema of temas) {
    await page.goto(`/material?tema=${tema}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const colores = await page
      .locator('mat-form-field')
      .filter({ hasText: 'Precio bloqueado' })
      .locator('input')
      .evaluate((elemento) => {
        const estilo = getComputedStyle(elemento);
        let padre = elemento.parentElement;

        while (padre) {
          const fondo = getComputedStyle(padre).backgroundColor;

          if (fondo !== 'rgba(0, 0, 0, 0)' && fondo !== 'transparent') {
            return { fondo, texto: estilo.color };
          }

          padre = padre.parentElement;
        }

        return {
          fondo: getComputedStyle(document.body).backgroundColor,
          texto: estilo.color,
        };
      });

    const ratio = contraste(colores.fondo, colores.texto);

    expect(ratio, `${tema}: ${colores.texto} sobre ${colores.fondo}`).toBeGreaterThanOrEqual(4.5);
  }
});
