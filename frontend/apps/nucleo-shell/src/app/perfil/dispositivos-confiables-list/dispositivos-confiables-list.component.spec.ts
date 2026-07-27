import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '@nucleo/ui-shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispositivoConfiable } from '../seguridad.types';
import { DispositivosConfiablesListComponent } from './dispositivos-confiables-list.component';

describe('DispositivosConfiablesListComponent', () => {
  let fixture: ComponentFixture<DispositivosConfiablesListComponent>;
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };

  const dispositivos: DispositivoConfiable[] = [
    {
      id: 1,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
      ip_registro: '127.0.0.1',
      fecha_creacion: '2026-07-01T10:00:00Z',
      fecha_expiracion: '2026-08-01T10:00:00Z',
      es_actual: true,
    },
    {
      id: 2,
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS) Safari/604.1',
      ip_registro: '10.0.0.5',
      fecha_creacion: '2026-06-15T10:00:00Z',
      fecha_expiracion: '2026-07-15T10:00:00Z',
      es_actual: false,
    },
  ];

  beforeEach(async () => {
    confirmDialog = { confirm: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DispositivosConfiablesListComponent],
      providers: [{ provide: ConfirmDialogService, useValue: confirmDialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(DispositivosConfiablesListComponent);
  });

  it('renderiza cada dispositivo con su navegador/sistema y marca el actual', () => {
    fixture.componentInstance.dispositivos = dispositivos;
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Chrome en Windows');
    expect(texto).toContain('Safari en iOS');
    expect(texto).toContain('Este dispositivo');
  });

  it('muestra un mensaje cuando no hay dispositivos', () => {
    fixture.componentInstance.dispositivos = [];
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes dispositivos confiados');
  });

  it('pide confirmacion y emite revocar con el id al confirmar', async () => {
    fixture.componentInstance.dispositivos = dispositivos;
    fixture.detectChanges();
    confirmDialog.confirm.mockResolvedValue(true);
    const emitidos: number[] = [];
    fixture.componentInstance.revocar.subscribe((id) => emitidos.push(id));

    await fixture.componentInstance.onRevocar(dispositivos[0]);

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(emitidos).toEqual([1]);
  });

  it('no emite revocar si el usuario cancela la confirmacion', async () => {
    fixture.componentInstance.dispositivos = dispositivos;
    fixture.detectChanges();
    confirmDialog.confirm.mockResolvedValue(false);
    const emitidos: number[] = [];
    fixture.componentInstance.revocar.subscribe((id) => emitidos.push(id));

    await fixture.componentInstance.onRevocar(dispositivos[0]);

    expect(emitidos).toEqual([]);
  });

  it('emite revocarTodos al confirmar la revocacion masiva', async () => {
    fixture.componentInstance.dispositivos = dispositivos;
    fixture.detectChanges();
    confirmDialog.confirm.mockResolvedValue(true);
    let veces = 0;
    fixture.componentInstance.revocarTodos.subscribe(() => veces++);

    await fixture.componentInstance.onRevocarTodos();

    expect(veces).toBe(1);
  });
});
