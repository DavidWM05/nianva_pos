<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_sesion_saldos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('caja_sesion_id')->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago')->restrictOnDelete();
            $table->decimal('saldo_teorico', 12, 2);
            $table->unique(['caja_sesion_id', 'metodo_pago_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_sesion_saldos');
    }
};
