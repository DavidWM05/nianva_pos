<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Modelos auditados
    |--------------------------------------------------------------------------
    |
    | Valor por defecto del modulo: vacio a proposito. Auditoria no conoce
    | los modelos de otros modulos (Nucleo, Inventario, etc.) -- quien los
    | lista es la app, en config/auditoria.php (raiz del proyecto), que si
    | puede depender de ambos lados. Ver ese archivo para los valores reales.
    */
    'auditables' => [],
];
