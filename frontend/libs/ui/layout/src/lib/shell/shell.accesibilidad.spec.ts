import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { PantallaService } from './pantalla.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent accesibilidad', () => {
  it('permite enfocar por teclado la region de contenido desplazable', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PantallaService, useValue: { angosta: signal(false).asReadonly() } }],
    });

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const contenido = fixture.nativeElement.querySelector('main') as HTMLElement;

    expect(contenido.getAttribute('tabindex')).toBe('0');
  });
});
