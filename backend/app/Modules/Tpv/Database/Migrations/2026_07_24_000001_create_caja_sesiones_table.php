<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_sesiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->decimal('monto_apertura', 10, 2);
            $table->decimal('monto_cierre', 10, 2)->nullable();
            $table->decimal('total_ventas_sistema', 10, 2)->nullable();
            $table->decimal('diferencia', 10, 2)->nullable();
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
