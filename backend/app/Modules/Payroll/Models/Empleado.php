<?php

namespace App\Modules\Payroll\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Payroll\Database\Factories\EmpleadoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'usuario_id', 'sucursal_id', 'salario_base', 'tipo_salario', 'fecha_ingreso', 'numero_seguridad_social', 'activo'])]
class Empleado extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<EmpleadoFactory> */
    use HasFactory;

    protected $table = 'empleados';

    protected function casts(): array
    {
        return ['salario_base' => 'decimal:2', 'activo' => 'boolean', 'fecha_ingreso' => 'date'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }
}
