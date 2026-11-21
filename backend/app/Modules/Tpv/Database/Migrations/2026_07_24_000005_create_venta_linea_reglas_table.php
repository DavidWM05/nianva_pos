<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * DAT-03: reglas combinadas de una línea de venta. Cuando se combinaron varias reglas, cada una con su id, su nombre copiado y
 * el descuento que dio; la regla principal también queda en la línea (regla_precio_id y
 * regla_nombre). El id es copia, sin llave foránea, para que la foto no cambie con el catálogo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venta_linea_reglas', function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26)->unique();
            $table->foreignId('venta_detalle_id')->constrained('venta_detalles')->cascadeOnDelete();
            $table->unsignedBigInteger('regla_precio_id');
            $table->string('regla_nombre', 120);
            $table->decimal('descuento', 12, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venta_linea_reglas');
    }
};
