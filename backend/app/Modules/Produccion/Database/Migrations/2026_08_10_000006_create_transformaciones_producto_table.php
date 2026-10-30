<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transformaciones_producto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('variante_origen_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->foreignId('variante_destino_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->decimal('cantidad_origen', 10, 2);
            $table->decimal('cantidad_destino', 10, 2);
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->text('notas')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->index('tenant_id');
            $table->index('variante_origen_id');
            $table->index('variante_destino_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transformaciones_producto');
    }
};
