<?php

namespace App\Modules\GiftCards\Models;

use App\Modules\GiftCards\Database\Factories\GiftCardRecargaFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['gift_card_id', 'caja_sesion_id', 'monto', 'usuario_id'])]
class GiftCardRecarga extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<GiftCardRecargaFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'gift_card_recargas';

    protected $casts = [
        'monto' => 'decimal:2',
        'fecha' => 'datetime',
    ];

    public static function tenantRelacion(): string
    {
        return 'giftCard';
    }

    public function giftCard(): BelongsTo
    {
        return $this->belongsTo(GiftCard::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
