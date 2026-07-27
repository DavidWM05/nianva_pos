<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartado_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('apartado_id')->constrained('apartados')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_unitario', 10, 2);
            $table->decimal('subtotal', 10, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartado_detalles');
    }
};
