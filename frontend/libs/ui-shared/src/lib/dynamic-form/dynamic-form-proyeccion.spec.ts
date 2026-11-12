import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

// Serie 50g: campos que la pantalla proyecta dentro del formulario (Sucursal, Roles,
// Permisos), antes del boton de envio. Su validacion bloquea el envio; su readonly es de la
// pantalla.
const CAMPOS: DynamicFormField[] = [{ name: 'nombre', label: 'Nombre', type: 'text', defaultValue: 'Ana' }];

@Component({
  standalone: true,
  imports: [DynamicFormComponent, ReactiveFormsModule],
  template: `
    <nucleo-dynamic-form [fields]="campos" submitLabel="Crear" (formSubmit)="emitidos.push($event)">
      <div class="campo-proyectado">
        <label for="extra">Extra</label>
        <input id="extra" [formControl]="extra" />
      </div>
    </nucleo-dynamic-form>
  `,
})
class ConProyeccion {
  @ViewChild(DynamicFormComponent) formulario!: DynamicFormComponent;
  campos = CAMPOS;
  extra = new FormControl<string | null>(null, Validators.required);
  emitidos: Record<string, unknown>[] = [];
}

@Component({
  standalone: true,
  imports: [DynamicFormComponent],
  template: `<nucleo-dynamic-form [fields]="campos" submitLabel="Crear" />`,
})
class SinProyeccion {
  campos = CAMPOS;
}

describe('DynamicFormComponent (contenido proyectado)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConProyeccion, SinProyeccion],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function crear<T>(tipo: new () => T): ComponentFixture<T> {
    const fixture = TestBed.createComponent(tipo);
    fixture.detectChanges();

    return fixture;
  }

  it('sin contenido proyectado, el <form> solo tiene los campos y la barra de acciones', () => {
    const form = (crear(SinProyeccion).nativeElement as HTMLElement).querySelector('form');

    expect([...(form?.children ?? [])].map((hijo) => hijo.tagName.toLowerCase())).toEqual(['div', 'ui-form-actions']);
  });

  it('el contenido proyectado va dentro del <form>, despues de los campos y antes del boton', () => {
    const raiz = crear(ConProyeccion).nativeElement as HTMLElement;
    const form = raiz.querySelector('form');
    const hijos = [...(form?.children ?? [])];
    const proyectado = raiz.querySelector('.campo-proyectado');

    expect(proyectado?.closest('form')).toBe(form);
    expect(hijos.indexOf(proyectado as Element)).toBe(hijos.length - 2);
    expect(hijos.at(-1)?.tagName.toLowerCase()).toBe('ui-form-actions');
  });

  it('un control proyectado invalido bloquea el envio y queda marcado como tocado', () => {
    const fixture = crear(ConProyeccion);
    const anfitrion = fixture.componentInstance;

    anfitrion.formulario.onSubmit();

    expect(anfitrion.emitidos).toEqual([]);
    expect(anfitrion.extra.touched).toBe(true);
  });

  it('con el control proyectado valido, el formulario se envia', () => {
    const fixture = crear(ConProyeccion);
    const anfitrion = fixture.componentInstance;
    anfitrion.extra.setValue('listo');

    anfitrion.formulario.onSubmit();

    expect(anfitrion.emitidos).toEqual([{ nombre: 'Ana' }]);
  });

  it('un input proyectado pertenece al mismo <form>: enviarlo desde ahi (Enter) dispara el envio', () => {
    // jsdom no implementa el envio implicito al pulsar Enter; lo que lo hace posible en el
    // navegador es que el input pertenezca al <form>, y eso es lo que se comprueba aqui.
    const fixture = crear(ConProyeccion);
    const anfitrion = fixture.componentInstance;
    anfitrion.extra.setValue('listo');
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#extra');

    expect(input?.form).toBe((fixture.nativeElement as HTMLElement).querySelector('form'));
    input?.form?.requestSubmit();

    expect(anfitrion.emitidos).toEqual([{ nombre: 'Ana' }]);
  });
});
