<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DAT-04: libro de crédito de una cuenta por cobrar, de solo inserción. cuentas_cobrar.saldo_pendiente es su proyección. El
 * primer renglón es saldo_inicial (DAT-05). Montos con signo: lo que baja el saldo es negativo.
 * El usuario se guarda cuando la operación lo trae.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuenta_cobrar_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_cobrar_id')->constrained('cuentas_cobrar')->cascadeOnDelete();
            $table->enum('tipo', ['saldo_inicial', 'abono']);
            $table->string('referencia_tabla', 60)->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->decimal('monto', 12, 2);
            $table->decimal('saldo_antes', 12, 2);
            $table->decimal('saldo_despues', 12, 2);
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('fecha')->useCurrent();

            $table->index('cuenta_cobrar_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuenta_cobrar_movimientos');
    }
};
