export type SegmentoCampana = 'todos' | 'nuevo' | 'frecuente' | 'vip' | 'inactivo';

export interface CampanaUsuarioResumen {
  id: number;
  nombre: string;
}

/** CrmCampanaResource (backend/app/Modules/CrmAvanzado/Http/Resources/CrmCampanaResource.php). */
export interface Campana {
  id: number;
  usuario?: CampanaUsuarioResumen;
  asunto: string;
  segmento: SegmentoCampana | null;
  destinatarios: number;
  enviado_en: string | null;
  created_at: string;
}

export interface CampanaEnviarPayload {
  segmento?: SegmentoCampana | null;
  asunto: string;
  mensaje: string;
}
