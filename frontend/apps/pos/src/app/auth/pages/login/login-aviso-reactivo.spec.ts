import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent: aviso de inactividad con el login ya abierto', () => {
  // Si otra pestana expira mientras esta ya esta en /login, SesionEntrePestanasService navega a
  // /login?aviso=inactividad: Angular reutiliza el mismo componente y solo cambia el parametro.
  it('muestra el aviso cuando el parametro llega despues de crear el componente', async () => {
    const parametros = new BehaviorSubject<ParamMap>(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        AuthStateService,
        { provide: AuthService, useValue: { login: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, queryParamMap: parametros },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto()).not.toContain('Tu sesión se cerró por inactividad.');

    parametros.next(convertToParamMap({ aviso: 'inactividad' }));
    fixture.detectChanges();

    expect(texto()).toContain('Tu sesión se cerró por inactividad.');
  });
});
