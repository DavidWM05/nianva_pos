<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 50);
            $table->string('nombre', 120);
            $table->enum('tipo', ['porcentaje', 'monto_fijo']);
            $table->decimal('valor', 10, 2);
            $table->integer('uso_maximo')->nullable();
            $table->integer('uso_maximo_por_cliente')->nullable();
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();

            $table->unique(['tenant_id', 'codigo'], 'uq_cupones_tenant_codigo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupones');
    }
};
