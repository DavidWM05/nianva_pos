import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '@nianva/ui-shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispositivoConfiable } from '../seguridad.types';
import { DispositivosConfiablesListComponent } from './dispositivos-confiables-list.component';

// Los botones se buscan por su rol y su texto, no por el componente que los pinta: el spec vale
// igual con PrimeNG y con Material (50i).
describe('DispositivosConfiablesListComponent: botones', () => {
  let fixture: ComponentFixture<DispositivosConfiablesListComponent>;
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };

  const dispositivo = (id: number): DispositivoConfiable => ({
    id,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
    ip_registro: '127.0.0.1',
    fecha_creacion: '2026-07-01T10:00:00Z',
    fecha_expiracion: '2026-08-01T10:00:00Z',
    es_actual: id === 1,
  });

  beforeEach(async () => {
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DispositivosConfiablesListComponent],
      providers: [{ provide: ConfirmDialogService, useValue: confirmDialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(DispositivosConfiablesListComponent);
  });

  function pintar(dispositivos: DispositivoConfiable[], cargando = false): HTMLElement {
    fixture.componentRef.setInput('dispositivos', dispositivos);
    fixture.componentRef.setInput('cargando', cargando);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  const botones = (el: HTMLElement, texto: string): HTMLButtonElement[] =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent?.trim() === texto);

  it('un boton "Revocar" por dispositivo, que pide confirmacion y emite su id', async () => {
    const el = pintar([dispositivo(1), dispositivo(2)]);
    const emitidos: number[] = [];
    fixture.componentInstance.revocar.subscribe((id) => emitidos.push(id));

    expect(botones(el, 'Revocar').length).toBe(2);
    botones(el, 'Revocar')[1].click();
    await fixture.whenStable();

    expect(confirmDialog.confirm).toHaveBeenCalledTimes(1);
    expect(emitidos).toEqual([2]);
  });

  it('"Revocar todos" solo aparece con mas de un dispositivo y emite al confirmar', async () => {
    expect(botones(pintar([dispositivo(1)]), 'Revocar todos').length).toBe(0);

    const el = pintar([dispositivo(1), dispositivo(2)]);
    let veces = 0;
    fixture.componentInstance.revocarTodos.subscribe(() => veces++);
    botones(el, 'Revocar todos')[0].click();
    await fixture.whenStable();

    expect(veces).toBe(1);
  });

  it('mientras carga no muestra la lista ni el texto de vacio', () => {
    const el = pintar([], true);

    expect(el.textContent).not.toContain('No tienes dispositivos confiados');
    expect(el.querySelector('ul')).toBeNull();
  });
});
