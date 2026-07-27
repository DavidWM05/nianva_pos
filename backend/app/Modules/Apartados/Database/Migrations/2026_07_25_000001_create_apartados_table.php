<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete()->comment('venta generada al liquidar');
            $table->decimal('total', 10, 2);
            $table->decimal('total_abonado', 10, 2)->default(0);
            $table->enum('estado', ['activo', 'completado', 'cancelado'])->default('activo');
            $table->dateTime('fecha_creacion')->useCurrent();
            $table->date('fecha_vencimiento')->nullable();
            $table->dateTime('fecha_completado')->nullable();
            $table->dateTime('fecha_cancelado')->nullable();
            $table->foreignId('usuario_cancelacion_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->text('motivo_cancelacion')->nullable();
            $table->text('notas')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartados');
    }
};
