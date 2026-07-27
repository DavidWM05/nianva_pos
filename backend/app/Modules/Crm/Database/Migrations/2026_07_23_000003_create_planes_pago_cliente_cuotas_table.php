<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes_pago_cliente_cuotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_pago_cliente_id')->constrained('planes_pago_cliente')->cascadeOnDelete();
            $table->integer('numero_cuota');
            $table->decimal('monto', 10, 2);
            $table->date('fecha_vencimiento');
            $table->dateTime('fecha_pago')->nullable();
            $table->enum('estado', ['pendiente', 'pagada', 'vencida'])->default('pendiente');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_pago_cliente_cuotas');
    }
};
