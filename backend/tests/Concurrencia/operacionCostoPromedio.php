<?php

declare(strict_types=1);

use App\Aplicacion\Inventario\RegistrarCompra;
use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;

$compra = app(RegistrarCompra::class)->ejecutar(new CompraDto($datos['proveedor'], null, [new LineaCompraDto($datos['variante'], $datos['cantidad'], $datos['costo'])]), $usuario);
$emitir(['resultado' => 'compra_promedio', 'compra_id' => $compra->id]);
