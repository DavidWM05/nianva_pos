<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_sesiones', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 48)->nullable();
            $table->unique(['sucursal_id', 'folio']);
            $table->char('ulid', 26)->unique();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('terminal_id')->constrained('terminales')->restrictOnDelete();
            $table->foreignId('caja_consolidado_id')->nullable()->constrained('caja_consolidados')->restrictOnDelete();
            $table->foreignId('supervisor_apertura_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('usuario_cierre_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->decimal('monto_apertura', 12, 2);
            // DAT-04: proyección del libro de caja (caja_movimientos); nace igual a la apertura.
            $table->decimal('saldo_teorico', 12, 2);
            $table->decimal('monto_cierre', 12, 2)->nullable();
            $table->decimal('total_teorico', 12, 2)->nullable();
            $table->decimal('total_ventas_sistema', 12, 2)->nullable();
            $table->decimal('diferencia', 12, 2)->nullable();
            $table->dateTime('fecha_apertura')->useCurrent();
            $table->date('fecha_operativa');
            $table->index(['sucursal_id', 'fecha_operativa', 'estado']);
            $table->dateTime('fecha_cierre')->nullable();
            $table->enum('estado', ['abierta', 'cerrada'])->default('abierta');
            $table->unsignedBigInteger('terminal_abierta_id')->nullable()
                ->virtualAs("CASE WHEN estado = 'abierta' THEN terminal_id ELSE NULL END")->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_sesiones');
    }
};
