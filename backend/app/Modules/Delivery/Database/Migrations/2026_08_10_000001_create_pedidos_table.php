<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('repartidor_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->string('numero_pedido', 30);
            $table->text('direccion_entrega')->nullable();
            $table->string('referencia', 255)->nullable();
            $table->decimal('costo_delivery', 10, 2)->default(0);
            $table->enum('estado', ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'])->default('pendiente');
            $table->unsignedInteger('tiempo_estimado')->nullable()->comment('Minutos estimados');
            $table->text('notas')->nullable();
            $table->dateTime('fecha_entrega')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->index('venta_id');
            $table->index('cliente_id');
            $table->index('repartidor_id');
            $table->index('estado');
            $table->unique(['tenant_id', 'numero_pedido']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
