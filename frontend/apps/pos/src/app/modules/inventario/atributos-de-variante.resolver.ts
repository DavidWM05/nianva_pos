import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { Atributo, AtributoService } from '@nianva/domain-inventario';
import { catchError, of } from 'rxjs';

/**
 * ARQ-07: los atributos con sus valores para el formulario de variante del detalle de producto.
 * Si la carga falla, la vista abre igual y el formulario no muestra selectores de atributo.
 */
export const atributosDeVarianteResolver: ResolveFn<Atributo[]> = () =>
  inject(AtributoService)
    .conValores()
    .pipe(catchError(() => of([])));
