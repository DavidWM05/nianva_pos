<?php

namespace App\Modules\GiftCards\Http\Controllers;

use App\Aplicacion\GiftCards\CancelarGiftCard;
use App\Aplicacion\GiftCards\EmitirGiftCard;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Http\Controllers\Controller;
use App\Modules\GiftCards\Http\Requests\EmitirGiftCardRequest;
use App\Modules\GiftCards\Http\Requests\RecargarGiftCardRequest;
use App\Modules\GiftCards\Http\Resources\GiftCardResource;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

class GiftCardController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'saldo_actual', 'created_at'];

    public function index(Request $request)
    {
        $query = GiftCard::query()->with(['cliente:id,nombre']);

        if ($clienteId = $request->query('filtro_cliente_id')) {
            $query->where('cliente_id', $clienteId);
        }

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($codigo = $request->query('filtro_codigo')) {
            $query->where('codigo', 'like', "%{$codigo}%");
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('id');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => GiftCardResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'gift_cards', ['ver', 'emitir', 'recargar', 'cancelar']),
            ],
        ]);
    }

    public function store(EmitirGiftCardRequest $request, EmitirGiftCard $action)
    {
        $dto = $request->toDto();

        $giftCard = $action->ejecutar($dto, (int) app(TenantContext::class)->id());

        return (new GiftCardResource($giftCard))->response()->setStatusCode(201);
    }

    public function show(GiftCard $giftCard)
    {
        $giftCard->load(['cliente', 'recargas.usuario']);

        return new GiftCardResource($giftCard);
    }

    public function recargar(RecargarGiftCardRequest $request, int $id, RecargarGiftCard $action)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $giftCard = $action->ejecutar($request->toDto(), $id, $usuario);

        return new GiftCardResource($giftCard);
    }

    public function cancelar(int $id, CancelarGiftCard $action)
    {
        $action->ejecutar($id);

        return response()->json(['message' => 'Gift Card cancelada correctamente.']);
    }

    private function permisosDe(Request $request, string $modulo, array $acciones): array
    {
        $usuario = $request->user();
        $resultado = [];
        foreach ($acciones as $accion) {
            $resultado[$accion] = $usuario->tienePermiso("{$modulo}.{$accion}");
        }

        return $resultado;
    }
}
