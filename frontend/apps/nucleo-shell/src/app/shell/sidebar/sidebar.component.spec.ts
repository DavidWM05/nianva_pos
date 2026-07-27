import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { NUCLEO_ITEM_INICIO, NUCLEO_NAV_GROUPS } from '../../modules/modules.config';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  const totalItems = NUCLEO_NAV_GROUPS.reduce((acumulado, grupo) => acumulado + grupo.items.length, 0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  function expandirTodosLosGrupos(): void {
    for (const grupo of NUCLEO_NAV_GROUPS) {
      fixture.componentInstance.toggleGroup(grupo.key);
    }
    fixture.detectChanges();
  }

  it('renderiza un encabezado por cada uno de los 3 grupos', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const grupo of NUCLEO_NAV_GROUPS) {
      expect(texto).toContain(grupo.label);
    }
  });

  it('arranca con los grupos colapsados -- sin ruta activa que los expanda de entrada', () => {
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('.sidebar__link');
    // Solo Inicio (fuera de los grupos) + Demo, ningun item de negocio todavia.
    expect(links.length).toBe(2);
  });

  it('Inicio esta siempre visible, fuera de cualquier grupo', () => {
    const anchors = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.sidebar__link'),
    );
    const inicio = anchors.find((a) => a.textContent?.includes(NUCLEO_ITEM_INICIO.label));

    expect(inicio).toBeTruthy();
    expect(inicio?.getAttribute('href')).toBe(`/${NUCLEO_ITEM_INICIO.path}`);
  });

  it('expandir un grupo revela sus enlaces, con el href correcto', () => {
    expandirTodosLosGrupos();

    const anchors = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.sidebar__link'),
    );
    // Items de negocio (3 grupos) + Inicio + Demo.
    expect(anchors.length).toBe(totalItems + 2);

    for (const grupo of NUCLEO_NAV_GROUPS) {
      for (const item of grupo.items) {
        const anchor = anchors.find((a) => a.textContent?.includes(item.label));
        expect(anchor, `no se encontro enlace para ${item.label}`).toBeTruthy();
        expect(anchor?.getAttribute('href')).toBe(`/${item.path}`);
      }
    }
  });

  it('TPV aparece como 3 enlaces independientes (Venta/Caja/Ventas), no uno solo', () => {
    expandirTodosLosGrupos();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Venta');
    expect(texto).toContain('Caja');
    expect(texto).toContain('Ventas');
  });

  it('toggleGroup vuelve a colapsar un grupo ya expandido', () => {
    const grupo = NUCLEO_NAV_GROUPS[0];
    fixture.componentInstance.toggleGroup(grupo.key);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(grupo.items[0].label);

    fixture.componentInstance.toggleGroup(grupo.key);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(grupo.items[0].label);
  });

  it('arranca expandido (sidebar completo) y el boton de colapsar oculta las etiquetas de texto', () => {
    const component = fixture.componentInstance;
    expect((fixture.nativeElement as HTMLElement).querySelector('.sidebar--collapsed')).toBeNull();

    component.toggleCollapsed();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.sidebar--collapsed')).not.toBeNull();
    // colapsado: ya no se muestra el texto de la marca "Núcleo" en el header
    expect((fixture.nativeElement as HTMLElement).querySelector('.sidebar__brand')).toBeNull();
  });
});
