<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUlids;

/**
 * DAT-08: las tablas transaccionales llevan, además del id bigint interno, una columna `ulid`
 * única que es la que se publica. HasUlids de Laravel la llena al insertar (performInsert), así
 * que también la reciben las factories y los seeders; como `id` no está en uniqueIds(), sigue
 * autoincremental. Las llaves foráneas siguen apuntando al id.
 */
trait TieneUlid
{
    use HasUlids;

    /**
     * @return list<string>
     */
    public function uniqueIds(): array
    {
        return ['ulid'];
    }
}
