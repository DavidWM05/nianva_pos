<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas_cobrar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('venta_id')->constrained('ventas')->restrictOnDelete()
                ->comment('Venta que origina la deuda');
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->decimal('monto_total', 10, 2);
            $table->decimal('saldo_pendiente', 10, 2);
            $table->date('fecha_vencimiento')->nullable()
                ->comment('Default: fecha_venta + N dias (configurable)');
            $table->enum('estado', ['pendiente', 'pagada', 'anulada'])->default('pendiente');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->index('venta_id');
            $table->index('cliente_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuentas_cobrar');
    }
};
