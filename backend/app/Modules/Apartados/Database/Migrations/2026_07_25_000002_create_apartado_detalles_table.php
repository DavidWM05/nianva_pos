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
            $table->decimal('cantidad', 14, 3);
            // DAT-03: foto de la línea al momento de la operación. NOT NULL y sin default, salvo los
            // pares lista y regla, que son null juntos cuando no aplicaron. Los ids de lista y regla
            // son copia (sin llave foránea): borrar o renombrar el catálogo no cambia la foto.
            $table->decimal('precio_unitario', 12, 2);
            $table->decimal('descuento', 12, 2);
            $table->unsignedBigInteger('lista_precio_id')->nullable();
            $table->string('lista_precio_nombre', 120)->nullable();
            $table->unsignedBigInteger('regla_precio_id')->nullable();
            $table->string('regla_nombre', 120)->nullable();
            $table->decimal('costo_unitario', 12, 2);
            $table->decimal('tasa_impuesto', 7, 4);
            $table->boolean('exento');
            $table->decimal('impuesto', 12, 2);
            $table->foreignId('unidad_medida_id')->constrained('unidades_medida')->restrictOnDelete();
            $table->decimal('factor', 14, 3);
            $table->decimal('subtotal', 12, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartado_detalles');
    }
};
