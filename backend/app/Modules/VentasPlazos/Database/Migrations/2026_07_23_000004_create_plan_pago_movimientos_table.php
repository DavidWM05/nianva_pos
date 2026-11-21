<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DAT-04: libro de crédito de un plan de pagos, de solo inserción. planes_pago_cliente.saldo_pendiente es su proyección. El
 * primer renglón es saldo_inicial (DAT-05). Montos con signo: lo que baja el saldo es negativo.
 * El usuario se guarda cuando la operación lo trae.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_pago_movimientos', function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26)->unique();
            $table->foreignId('plan_pago_cliente_id')->constrained('planes_pago_cliente')->cascadeOnDelete();
            $table->enum('tipo', ['saldo_inicial', 'pago_cuota']);
            $table->string('referencia_tabla', 60)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->decimal('monto', 12, 2);
            $table->decimal('saldo_antes', 12, 2);
            $table->decimal('saldo_despues', 12, 2);
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('fecha')->useCurrent();

            $table->index('plan_pago_cliente_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_pago_movimientos');
    }
};
