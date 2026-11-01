<?php

namespace App\Modules\Payroll\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Payroll\Database\Factories\NominaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'sucursal_id', 'periodo_inicio', 'periodo_fin', 'total_percepciones', 'total_deducciones', 'total_neto', 'estado', 'fecha_pago'])]
class Nomina extends Model
{
    use BelongsToSucursal;
    use BelongsToTenant;

    /** @use HasFactory<NominaFactory> */
    use HasFactory;

    protected $table = 'nominas';

    protected function casts(): array
    {
        return ['total_percepciones' => 'decimal:2', 'total_deducciones' => 'decimal:2', 'total_neto' => 'decimal:2', 'periodo_inicio' => 'date', 'periodo_fin' => 'date', 'fecha_pago' => 'date'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(NominaDetalle::class);
    }
}
