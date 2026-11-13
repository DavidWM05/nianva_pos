import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';

/** Espejo de CuponController::validar() del backend. */
export interface CuponValidacion {
  cupon: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: 'porcentaje' | 'monto_fijo';
    valor: string;
  };
  descuento: number;
  total_con_descuento: number;
}

/**
 * Servicio propio de Tpv, deliberadamente separado de CuponService
 * (modulo Precios, que administra el catalogo de cupones) -- la pantalla
 * de venta solo necesita "validar este codigo contra este total", no el
 * CRUD de cupones. Mismo criterio de no invertir/duplicar dependencias
 * entre modulos que ya se sigue en el backend (ver VentaController).
 */
@Injectable({ providedIn: 'root' })
export class CuponValidacionService {
  private readonly http = inject(HttpClient);

  validar(codigo: string, total: number): Observable<CuponValidacion> {
    const cuerpo: CuerpoDe<'/cupones/validar', 'post'> = { codigo, total };

    return this.http
      .post<RespuestaDe<'/cupones/validar', 'post'>>(urlApi(`/cupones/validar`), cuerpo)
      // El contrato tipa id como string y descuento como unknown (Scramble no los infiere): se
      // convierten aqui, sin cast doble.
      .pipe(
        map(({ data }) => ({
          cupon: { ...data.cupon, id: Number(data.cupon.id), tipo: data.cupon.tipo as CuponValidacion['cupon']['tipo'] },
          descuento: Number(data.descuento),
          total_con_descuento: data.total_con_descuento,
        })),
      );
  }
}
