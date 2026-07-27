<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventario_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sucursal_id')->constrained('sucursales')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('producto_variantes')->cascadeOnDelete();
            $table->integer('stock_actual')->default(0);
            $table->integer('stock_minimo')->default(0);
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['sucursal_id', 'variante_id'], 'uq_inventario_stock_sucursal_variante');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_stock');
    }
};
