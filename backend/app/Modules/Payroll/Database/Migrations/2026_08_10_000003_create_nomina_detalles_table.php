<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nomina_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nomina_id')->constrained('nominas')->cascadeOnDelete();
            $table->foreignId('empleado_id')->constrained('empleados')->restrictOnDelete();
            $table->decimal('salario_base', 10, 2);
            $table->integer('dias_trabajados')->default(0);
            $table->decimal('percepciones', 10, 2)->default(0);
            $table->decimal('deducciones', 10, 2)->default(0);
            $table->decimal('neto', 10, 2)->default(0);
            $table->dateTime('created_at')->useCurrent();
            $table->index('nomina_id');
            $table->index('empleado_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomina_detalles');
    }
};
