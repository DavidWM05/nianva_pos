<?php

declare(strict_types=1);

namespace App\Aplicacion\Crm;

use App\Modules\Crm\Exceptions\ClienteSistemaException;
use App\Modules\Crm\Models\Cliente;

/**
 * DAT-10: un cliente nunca se borra, se desactiva. "Publico General" (es_sistema) esta protegido
 * aqui: un cliente distinto al frontend oficial no puede desactivarlo solo porque el boton
 * estaba oculto.
 */
final class DesactivarCliente
{
    public function ejecutar(Cliente $cliente): Cliente
    {
        if ((bool) $cliente->getAttribute('es_sistema')) {
            throw new ClienteSistemaException((int) $cliente->getKey());
        }

        $cliente->update(['activo' => false]);

        return $cliente;
    }
}
