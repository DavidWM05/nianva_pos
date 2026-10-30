<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recetas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->string('nombre', 200);
            $table->text('descripcion')->nullable();
            $table->text('instrucciones')->nullable();
            $table->decimal('rendimiento', 10, 2)->default(1);
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('tenant_id');
            $table->index('variante_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recetas');
    }
};
