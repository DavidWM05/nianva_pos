<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DAT-04: libro de caja de solo inserción. Registra exactamente lo que entra al total teórico del
 * cierre: la apertura (saldo_inicial), cada pago de venta, la anulación como renglón inverso y cada
 * gasto, además de abonos, recargas, pagos CxP y reembolsos monetarios. La proyección por método
 * está en caja_sesion_saldos y su suma en caja_sesiones.saldo_teorico. Montos con signo: lo que sale es negativo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caja_sesion_id')->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago')->restrictOnDelete();
            $table->enum('tipo', ['saldo_inicial', 'venta', 'anulacion', 'gasto', 'abono_cxc', 'pago_cxp', 'abono_apartado', 'recarga_gc', 'devolucion']);
            $table->string('referencia_tabla', 60)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->decimal('monto', 12, 2);
            $table->decimal('saldo_antes', 12, 2);
            $table->decimal('saldo_despues', 12, 2);
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('fecha')->useCurrent();

            $table->index('caja_sesion_id');
            $table->index(['referencia_tabla', 'referencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_movimientos');
    }
};
