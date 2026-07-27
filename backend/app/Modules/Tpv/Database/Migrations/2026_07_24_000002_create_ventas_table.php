<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('caja_sesion_id')->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('cupon_id')->nullable()->constrained('cupones')->nullOnDelete();
            $table->dateTime('fecha')->useCurrent();
            $table->decimal('total', 10, 2);
            $table->decimal('descuento_cupon', 10, 2)->default(0);
            $table->decimal('descuento_manual', 10, 2)->default(0);
            $table->decimal('abono_previo', 10, 2)->default(0)->comment('liquidacion de apartado: lo ya cobrado antes');
            $table->boolean('es_venta_sombra')->default(false)->comment('true = venta generada por un cambio; excluir de reportes financieros');
            $table->enum('estado', ['completada', 'anulada'])->default('completada');
            $table->string('motivo_anulacion', 255)->nullable();
            $table->dateTime('fecha_anulacion')->nullable();
            $table->foreignId('usuario_anulacion_id')->nullable()->constrained('usuarios')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
