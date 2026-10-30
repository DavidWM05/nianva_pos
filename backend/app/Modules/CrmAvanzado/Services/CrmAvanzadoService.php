<?php

namespace App\Modules\CrmAvanzado\Services;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Exceptions\AjustePuntosInvalidoException;
use App\Modules\CrmAvanzado\Exceptions\PuntosInsuficientesException;
use App\Modules\CrmAvanzado\Exceptions\PuntosNoGeneradosException;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class CrmAvanzadoService
{
    public function registrarInteraccion(int $clienteId, array $data): CrmInteraccion
    {
        $cliente = Cliente::findOrFail($clienteId);

        return DB::transaction(function () use ($cliente, $data) {
            return CrmInteraccion::create([
                'tenant_id' => $cliente->tenant_id,
                'cliente_id' => $cliente->id,
                'usuario_id' => $data['usuario_id'],
                'tipo' => $data['tipo'],
                'observacion' => $data['observacion'],
            ]);
        });
    }

    public function obtenerInteracciones(int $clienteId, array $filtros = []): Collection
    {
        $query = CrmInteraccion::where('cliente_id', $clienteId);

        if (! empty($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
        }

        return $query->orderByDesc('fecha')->get();
    }

    public function calcularSegmento(int $clienteId): string
    {
        $ventas = Venta::where('cliente_id', $clienteId)->count();
        $ultimaVenta = Venta::where('cliente_id', $clienteId)
            ->where('estado', 'completada')
            ->latest('fecha')
            ->first();

        if ($ventas === 0) {
            return 'nuevo';
        }

        if ($ultimaVenta && $ultimaVenta->fecha < now()->subMonth()) {
            return 'inactivo';
        }

        if ($ventas >= 5) {
            return 'vip';
        }

        return 'frecuente';
    }

    public function recalcularSegmentos(): int
    {
        $clientes = Cliente::all();
        $contador = 0;

        foreach ($clientes as $cliente) {
            $segmento = $this->calcularSegmento($cliente->id);
            $cliente->update(['segmento' => $segmento]);
            $contador++;
        }

        return $contador;
    }

    /**
     * Registrar puntos de fidelidad por compra.
     * Tasa: 1 punto por cada 10 de total (configurable via $tasa).
     */
    public function registrarPuntosPorVenta(Venta $venta, int $tasa = 10): LoyaltyTransaccion
    {
        $puntos = (int) floor((float) $venta->total / $tasa);

        if ($puntos <= 0) {
            throw new PuntosNoGeneradosException;
        }

        return DB::transaction(function () use ($venta, $puntos) {
            /** @var Cliente $cliente */
            $cliente = $venta->cliente;

            $transaccion = LoyaltyTransaccion::create([
                'tenant_id' => $venta->tenant_id,
                'cliente_id' => $cliente->id,
                'tipo' => 'ganados',
                'puntos' => $puntos,
                'referencia_tabla' => 'ventas',
                'referencia_id' => $venta->id,
                'expira_en' => now()->addYear()->toDateString(),
            ]);

            $cliente->increment('puntos_loyalty', $puntos);
            $cliente->increment('puntos_acumulados', $puntos);

            return $transaccion;
        });
    }

    /**
     * Ajuste manual de puntos (positivo o negativo).
     */
    public function ajustarPuntos(int $clienteId, int $puntos, string $motivo): LoyaltyTransaccion
    {
        if ($puntos === 0) {
            throw new AjustePuntosInvalidoException;
        }

        return DB::transaction(function () use ($clienteId, $puntos) {
            $cliente = Cliente::findOrFail($clienteId);

            if ($puntos < 0 && ($cliente->puntos_loyalty + $puntos) < 0) {
                throw new PuntosInsuficientesException($cliente->puntos_loyalty);
            }

            $transaccion = LoyaltyTransaccion::create([
                'tenant_id' => $cliente->tenant_id,
                'cliente_id' => $cliente->id,
                'tipo' => 'ajuste',
                'puntos' => $puntos,
                'referencia_tabla' => 'ajuste',
                'referencia_id' => null,
            ]);

            $cliente->increment('puntos_loyalty', $puntos);

            if ($puntos > 0) {
                $cliente->increment('puntos_acumulados', $puntos);
            }

            return $transaccion;
        });
    }

    public function enviarCampana(array $data, int $tenantId, int $usuarioId): CrmCampana
    {
        $segmento = $data['segmento'] ?? null;
        $clienteIds = $data['cliente_ids'] ?? null;

        $query = Cliente::query();

        if ($clienteIds !== null) {
            $query->whereIn('id', (array) $clienteIds);
        } elseif ($segmento && $segmento !== 'todos') {
            $query->where('segmento', $segmento);
        }

        $clientes = $query->where('tenant_id', $tenantId)->get();

        return DB::transaction(function () use ($data, $clientes, $tenantId, $usuarioId) {
            $destinatarios = 0;

            foreach ($clientes as $cliente) {
                if (empty($cliente->correo)) {
                    continue;
                }

                // Registrar interaccion por cada cliente
                CrmInteraccion::create([
                    'tenant_id' => $tenantId,
                    'cliente_id' => $cliente->id,
                    'usuario_id' => $usuarioId,
                    'tipo' => 'email',
                    'observacion' => "Campaña: {$data['asunto']} — {$data['mensaje']}",
                ]);

                $destinatarios++;
            }

            return CrmCampana::create([
                'tenant_id' => $tenantId,
                'usuario_id' => $usuarioId,
                'asunto' => $data['asunto'],
                'mensaje' => $data['mensaje'],
                'segmento' => $data['segmento'] ?? null,
                'cliente_ids' => $data['cliente_ids'] ?? null,
                'destinatarios' => $destinatarios,
                'enviado_en' => now(),
            ]);
        });
    }
}
