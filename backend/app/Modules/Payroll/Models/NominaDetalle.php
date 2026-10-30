<?php

namespace App\Modules\Payroll\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['nomina_id', 'empleado_id', 'salario_base', 'dias_trabajados', 'percepciones', 'deducciones', 'neto'])]
class NominaDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    const UPDATED_AT = null;

    protected $table = 'nomina_detalles';

    protected function casts(): array
    {
        return ['salario_base' => 'decimal:2', 'dias_trabajados' => 'integer', 'percepciones' => 'decimal:2', 'deducciones' => 'decimal:2', 'neto' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'nomina';
    }

    public function nomina(): BelongsTo
    {
        return $this->belongsTo(Nomina::class);
    }

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }
}
