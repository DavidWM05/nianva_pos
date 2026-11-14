<?php

declare(strict_types=1);

namespace App\Aplicacion\Inventario;

use App\Modules\Inventario\Models\Proveedor;

/**
 * DAT-10: un proveedor con compras o cuentas por pagar nunca se borra, se desactiva. Deja de
 * aparecer en el catalogo (ProveedorController::index() solo lista activos) y su historia queda.
 */
final class DesactivarProveedor
{
    public function ejecutar(Proveedor $proveedor): Proveedor
    {
        $proveedor->update(['activo' => false]);

        return $proveedor;
    }
}
