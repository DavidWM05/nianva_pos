<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglas_precio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->enum('tipo', ['porcentaje', 'monto_fijo', 'nxm', 'bundle']);
            $table->decimal('valor', 10, 2)->nullable()->comment('usado en porcentaje/monto_fijo');
            $table->integer('cantidad_compra')->nullable()->comment('N en nxm/bundle');
            $table->integer('cantidad_paga')->nullable()->comment('M en nxm');
            $table->decimal('precio_bundle', 10, 2)->nullable()->comment('solo bundle');
            $table->enum('aplica_a', ['todo', 'categoria', 'producto', 'variante']);
            $table->foreignId('categoria_id')->nullable()->constrained('categorias')->cascadeOnDelete();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->cascadeOnDelete();
            $table->foreignId('variante_id')->nullable()->constrained('producto_variantes')->cascadeOnDelete();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reglas_precio');
    }
};
