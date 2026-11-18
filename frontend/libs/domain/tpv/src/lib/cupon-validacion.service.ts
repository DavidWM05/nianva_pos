import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';


/** Espejo de CuponController::validar() del backend. */
export interface CuponValidacion {
  cupon: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: 'porcentaje' | 'monto_fijo';
    porcentaje: RespuestaDe<'/cupones/validar', 'post'>['data']['cupon']['porcentaje'];
    monto: RespuestaDe<'/cupones/validar', 'post'>['data']['cupon']['monto'];
  };
  descuento: string;
  total_con_descuento: string;
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
      // Antes de API-02a
      // El contrato tipa id como string (Scramble no lo infiere): se convierte aqui, sin cast. El
      // tipo del cupon ya llega tipado desde el contrato (ARQ-12c).
      .pipe(
        map(({ data }) => ({
          cupon: { ...data.cupon, id: Number(data.cupon.id) },
          descuento: data.descuento,
          total_con_descuento: data.total_con_descuento,
        })),
      );
  }
}
