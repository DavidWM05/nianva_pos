<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_produccion', function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26);
            $table->unique(['tenant_id', 'ulid']);
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('receta_id')->constrained('recetas')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->decimal('cantidad_programada', 14, 3);
            $table->decimal('cantidad_producida', 14, 3)->nullable();
            $table->enum('estado', ['pendiente', 'en_proceso', 'completada', 'cancelada'])->default('pendiente');
            $table->text('notas')->nullable();
            $table->date('fecha_programada')->nullable();
            $table->dateTime('fecha_completada')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('tenant_id');
            $table->index('sucursal_id');
            $table->index('receta_id');
            $table->index('usuario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordenes_produccion');
    }
};
