<?php

namespace App\Modules\Payroll\Services;

use App\Modules\Payroll\Exceptions\EmpleadoYaExisteException;
use App\Modules\Payroll\Exceptions\NominaYaPagadaException;
use App\Modules\Payroll\Exceptions\SinEmpleadosException;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Payroll\Models\NominaDetalle;
use Illuminate\Support\Facades\DB;

class NominaService
{
    public function registrarEmpleado(array $data): Empleado
    {
        return DB::transaction(function () use ($data) {
            $existe = Empleado::where('usuario_id', $data['usuario_id'])->exists();
            if ($existe) {
                throw new EmpleadoYaExisteException;
            }

            return Empleado::create([
                'tenant_id' => $data['tenant_id'],
                'usuario_id' => $data['usuario_id'],
                'sucursal_id' => $data['sucursal_id'],
                'salario_base' => $data['salario_base'] ?? 0,
                'tipo_salario' => $data['tipo_salario'] ?? 'fijo',
                'fecha_ingreso' => $data['fecha_ingreso'] ?? null,
                'numero_seguridad_social' => $data['numero_seguridad_social'] ?? null,
                'activo' => true,
            ]);
        });
    }

    public function generarNomina(int $sucursalId, string $inicio, string $fin): Nomina
    {
        return DB::transaction(function () use ($sucursalId, $inicio, $fin) {
            $empleados = Empleado::where('sucursal_id', $sucursalId)
                ->where('activo', true)
                ->get();

            if ($empleados->isEmpty()) {
                throw new SinEmpleadosException($sucursalId);
            }

            $diasPeriodo = now()->parse($inicio)->diffInDays(now()->parse($fin)) + 1;

            $totalPercepciones = 0;
            $totalDeducciones = 0;
            $totalNeto = 0;
            $detalles = [];

            foreach ($empleados as $empleado) {
                $salarioBase = (float) $empleado->salario_base;
                $percepciones = round($salarioBase / 30 * $diasPeriodo, 2);
                $deducciones = 0; // Extensible a ISR/IMSS
                $neto = round($percepciones - $deducciones, 2);

                $detalles[] = [
                    'empleado_id' => $empleado->id,
                    'salario_base' => $salarioBase,
                    'dias_trabajados' => $diasPeriodo,
                    'percepciones' => $percepciones,
                    'deducciones' => $deducciones,
                    'neto' => $neto,
                ];

                $totalPercepciones += $percepciones;
                $totalDeducciones += $deducciones;
                $totalNeto += $neto;
            }

            $nomina = Nomina::create([
                'tenant_id' => $empleados->first()->tenant_id,
                'sucursal_id' => $sucursalId,
                'periodo_inicio' => $inicio,
                'periodo_fin' => $fin,
                'total_percepciones' => round($totalPercepciones, 2),
                'total_deducciones' => round($totalDeducciones, 2),
                'total_neto' => round($totalNeto, 2),
                'estado' => 'calculada',
            ]);

            foreach ($detalles as $det) {
                NominaDetalle::create(array_merge($det, ['nomina_id' => $nomina->id]));
            }

            return $nomina->load('detalles');
        });
    }

    public function pagarNomina(int $nominaId): Nomina
    {
        return DB::transaction(function () use ($nominaId) {
            $nomina = Nomina::where('id', $nominaId)->lockForUpdate()->firstOrFail();

            if ($nomina->estado === 'pagada') {
                throw new NominaYaPagadaException($nominaId);
            }

            $nomina->update([
                'estado' => 'pagada',
                'fecha_pago' => now()->toDateString(),
            ]);

            return $nomina->fresh();
        });
    }
}
