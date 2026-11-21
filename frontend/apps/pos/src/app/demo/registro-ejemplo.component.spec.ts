import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { AuditLogSource } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../testing/proveedores-pantalla';
import { RegistroEjemploComponent } from './registro-ejemplo.component';

/**
 * DAT-08: la auditoría por registro recibe el ulid en las tablas que se resuelven por ulid (ventas,
 * documentos, clientes) y el id en los catálogos. El demo no tiene un documento real, así que pide
 * la auditoría de un catálogo con su id; con `ventas` y un id numérico el backend responde 422.
 */
describe('RegistroEjemploComponent (demo de vista de registro)', () => {
  it('la pestaña de auditoría pide un catálogo por su id, no un documento por id numérico', async () => {
    const listar = vi.fn().mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [RegistroEjemploComponent],
      providers: [...proveedoresDePantalla(), { provide: AuditLogSource, useValue: { listar } }],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    }).compileComponents();

    const fixture = TestBed.createComponent(RegistroEjemploComponent);
    fixture.detectChanges();
    const [bloque] = await fixture.getDeferBlocks();
    await bloque.render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(listar).toHaveBeenCalledWith('productos', 1);
  });
});
