<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes_pago_cliente', function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26);
            $table->unique(['tenant_id', 'ulid']);
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->string('concepto', 200);
            $table->decimal('monto_total', 12, 2);
            // DAT-04: proyección del libro del plan (plan_pago_movimientos): lo que falta pagar.
            $table->decimal('saldo_pendiente', 12, 2);
            $table->date('fecha_inicio');
            $table->dateTime('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_pago_cliente');
    }
};
