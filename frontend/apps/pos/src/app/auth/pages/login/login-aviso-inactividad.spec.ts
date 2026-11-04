import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent aviso de inactividad', () => {
  let fixture: ComponentFixture<LoginComponent>;

  async function crear(aviso: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        AuthStateService,
        { provide: AuthService, useValue: { login: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(aviso === null ? {} : { aviso }),
            },
            queryParamMap: of(convertToParamMap(aviso === null ? {} : { aviso })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  it('muestra el aviso cuando llega el parametro de inactividad', async () => {
    await crear('inactividad');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Tu sesión se cerró por inactividad.');
  });

  it('no muestra el aviso sin el parametro', async () => {
    await crear(null);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).not.toContain('Tu sesión se cerró por inactividad.');
  });
});
