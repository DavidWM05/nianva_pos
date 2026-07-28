<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete()
                ->comment('Propietario (NULL = anonima)');
            $table->string('codigo', 50)->unique();
            $table->decimal('saldo_inicial', 10, 2);
            $table->decimal('saldo_actual', 10, 2);
            $table->date('fecha_expiracion')->nullable();
            $table->enum('estado', ['activa', 'usada', 'expirada', 'cancelada'])->default('activa');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->index('cliente_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_cards');
    }
};
