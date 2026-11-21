<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Models;

use App\Modules\GiftCards\Database\Factories\GiftCardRecargaPagoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['recarga_id', 'metodo_pago_id', 'monto'])]
class GiftCardRecargaPago extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<GiftCardRecargaPagoFactory> */
    use HasFactory;

    use TieneUlid;

    public $timestamps = false;

    protected $table = 'gift_card_recarga_pagos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'recarga.giftCard';
    }

    /** @return BelongsTo<GiftCardRecarga, $this> */
    public function recarga(): BelongsTo
    {
        return $this->belongsTo(GiftCardRecarga::class, 'recarga_id');
    }

    /** @return Builder<GiftCardRecargaPago> */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }
}
