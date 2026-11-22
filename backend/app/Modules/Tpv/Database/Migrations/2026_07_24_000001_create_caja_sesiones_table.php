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
            $table->dateTime('fecha_cierre')->nullable();
            $table->enum('estado', ['abierta', 'cerrada'])->default('abierta');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_sesiones');
    }
};
