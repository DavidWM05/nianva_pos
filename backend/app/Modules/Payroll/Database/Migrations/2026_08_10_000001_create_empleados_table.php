<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empleados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete()->unique();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->decimal('salario_base', 10, 2)->default(0);
            $table->enum('tipo_salario', ['fijo', 'por_hora'])->default('fijo');
            $table->date('fecha_ingreso')->nullable();
            $table->string('numero_seguridad_social', 30)->nullable();
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('tenant_id');
            $table->index('sucursal_id');
        });
    }

    public function down(): void { Schema::dropIfExists('empleados'); }
};
