<?php

namespace App\Modules\CrmAvanzado\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'usuario_id', 'asunto', 'mensaje', 'segmento', 'cliente_ids', 'destinatarios', 'enviado_en'])]
class CrmCampana extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'crm_campanas';

    protected function casts(): array
    {
        return [
            'cliente_ids' => 'array',
            'destinatarios' => 'integer',
            'enviado_en' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
