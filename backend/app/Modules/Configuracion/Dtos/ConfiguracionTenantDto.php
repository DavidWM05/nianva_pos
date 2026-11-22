<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Dtos;

final readonly class ConfiguracionTenantDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $moneda,
        public ?string $zonaHoraria,
        public ?string $mensajeTicket,
        public ?string $logoUrl,
        public bool $mostrarRfc,
        public bool $mostrarTelefono,
        public bool $mostrarCorreo,
        public bool $backupAuto,
        public string $backupFrecuencia,
        public bool $codigoBarrasAutomatico,
        private array $presentes,
        public ?string $tasaIvaDefault = null,
        public ?bool $cuponCombinableConPromociones = null,
        public ?string $margenDescuentoSupervisor = null,
        public ?string $umbralDescuadreSupervisor = null,
    ) {}

    /**
     * @return list<string>
     */
    public function camposPresentes(): array
    {
        return $this->presentes;
    }

    /**
     * @return array<string, mixed>
     */
    public function datosPresentes(): array
    {
        $datos = [];

        if (in_array('moneda', $this->presentes, true)) {
            $datos['moneda'] = $this->moneda;
        }
        if (in_array('zona_horaria', $this->presentes, true)) {
            $datos['zona_horaria'] = $this->zonaHoraria;
        }
        if (in_array('mensaje_ticket', $this->presentes, true)) {
            $datos['mensaje_ticket'] = $this->mensajeTicket;
        }
        if (in_array('logo_url', $this->presentes, true)) {
            $datos['logo_url'] = $this->logoUrl;
        }
        if (in_array('mostrar_rfc', $this->presentes, true)) {
            $datos['mostrar_rfc'] = $this->mostrarRfc;
        }
        if (in_array('mostrar_telefono', $this->presentes, true)) {
            $datos['mostrar_telefono'] = $this->mostrarTelefono;
        }
        if (in_array('mostrar_correo', $this->presentes, true)) {
            $datos['mostrar_correo'] = $this->mostrarCorreo;
        }
        if (in_array('backup_auto', $this->presentes, true)) {
            $datos['backup_auto'] = $this->backupAuto;
        }
        if (in_array('backup_frecuencia', $this->presentes, true)) {
            $datos['backup_frecuencia'] = $this->backupFrecuencia;
        }
        if (in_array('codigo_barras_automatico', $this->presentes, true)) {
            $datos['codigo_barras_automatico'] = $this->codigoBarrasAutomatico;
        }

        if (in_array('tasa_iva_default', $this->presentes, true)) {
            $datos['tasa_iva_default'] = $this->tasaIvaDefault;
        }

        if (in_array('cupon_combinable_con_promociones', $this->presentes, true)) {
            $datos['cupon_combinable_con_promociones'] = $this->cuponCombinableConPromociones;
        }

        if (in_array('margen_descuento_supervisor', $this->presentes, true)) {
            $datos['margen_descuento_supervisor'] = $this->margenDescuentoSupervisor;
        }
        if (in_array('umbral_descuadre_supervisor', $this->presentes, true)) {
            $datos['umbral_descuadre_supervisor'] = $this->umbralDescuadreSupervisor;
        }

        return $datos;
    }
}
