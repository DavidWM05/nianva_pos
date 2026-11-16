import type { CuerpoDe, GiftCardResource } from '@nianva/api-contrato';

/** Tipos de gift cards tal como los publica el contrato (ARQ-12b). */
export type GiftCard = GiftCardResource;

export type EstadoGiftCard = GiftCardResource['estado'];

export type GiftCardClienteResumen = NonNullable<GiftCardResource['cliente']>;

export type GiftCardRecarga = NonNullable<GiftCardResource['recargas']>[number];

export type GiftCardRecargaUsuario = NonNullable<GiftCardRecarga['usuario']>;

export type GiftCardEmitirPayload = CuerpoDe<'/gift-cards', 'post'>;
