<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_transacciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->enum('tipo', ['ganados', 'canjeados', 'vencidos', 'ajuste']);
            $table->integer('puntos')->comment('Positivo = ganados, Negativo = canjeados');
            $table->string('referencia_tabla', 60)->nullable()->comment('ventas, devoluciones, etc.');
            $table->unsignedBigInteger('referencia_id')->nullable()->comment('ID del registro origen');
            $table->date('expira_en')->nullable()->comment('Fecha de expiracion de los puntos');
            $table->dateTime('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('cliente_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transacciones');
    }
};
