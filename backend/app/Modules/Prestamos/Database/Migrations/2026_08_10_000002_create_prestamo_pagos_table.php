<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamo_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prestamo_id')->constrained('prestamos')->cascadeOnDelete();
            $table->foreignId('caja_sesion_id')->nullable()->constrained('caja_sesiones')->nullOnDelete();
            $table->decimal('monto', 10, 2);
            $table->dateTime('fecha')->useCurrent();
            $table->text('notas')->nullable();
            $table->index('prestamo_id');
            $table->index('caja_sesion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamo_pagos');
    }
};
