<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->foreignId('regla_precio_id')->nullable()->constrained('reglas_precio')->nullOnDelete();
            $table->decimal('cantidad', 14, 3);
            $table->foreignId('presentacion_id')->nullable()->constrained('presentaciones')->nullOnDelete();
            $table->string('presentacion_nombre', 120)->nullable();
            $table->decimal('factor', 14, 3)->default(1);
            $table->decimal('precio_unitario', 12, 2);
            $table->decimal('descuento_aplicado', 12, 2)->default(0);
            $table->decimal('subtotal', 12, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venta_detalles');
    }
};
