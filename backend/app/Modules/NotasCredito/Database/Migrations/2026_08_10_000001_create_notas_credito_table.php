<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notas_credito', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('devolucion_id')->constrained('devoluciones')->restrictOnDelete()
                ->comment('Devolucion que la origino');
            $table->decimal('monto_original', 10, 2);
            $table->decimal('saldo_disponible', 10, 2);
            $table->date('fecha_expiracion')->nullable();
            $table->enum('estado', ['activa', 'usada_parcial', 'usada_total', 'expirada', 'cancelada'])->default('activa');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->index('cliente_id');
            $table->index('devolucion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notas_credito');
    }
};
