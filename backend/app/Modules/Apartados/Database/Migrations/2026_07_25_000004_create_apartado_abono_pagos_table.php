<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartado_abono_pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('abono_id')->constrained('apartado_abonos')->cascadeOnDelete();
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago')->restrictOnDelete();
            $table->decimal('monto', 10, 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartado_abono_pagos');
    }
};
