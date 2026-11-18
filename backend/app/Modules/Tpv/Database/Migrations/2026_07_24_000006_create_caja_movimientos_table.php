<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DAT-04: libro de caja de solo inserción. Registra exactamente lo que entra al total teórico del
 * cierre: la apertura (saldo_inicial), cada pago de venta, la anulación como renglón inverso y cada
 * gasto. caja_sesiones.saldo_teorico es su proyección. Montos con signo: lo que sale es negativo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caja_sesion_id')->constrained('caja_sesiones')->restrictOnDelete();
            $table->enum('tipo', ['saldo_inicial', 'venta', 'anulacion', 'gasto']);
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
