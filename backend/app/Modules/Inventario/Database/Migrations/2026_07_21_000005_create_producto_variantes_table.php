<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producto_variantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('talla', 30)->nullable();
            $table->string('color', 30)->nullable();
            $table->string('codigo_barras', 50)->nullable();
            $table->decimal('precio_venta', 12, 2)->nullable();
            $table->decimal('costo', 12, 2)->nullable();
            $table->boolean('es_granel')->default(false);
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();

            $table->unique(['tenant_id', 'codigo_barras']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producto_variantes');
    }
};
