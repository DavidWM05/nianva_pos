<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devoluciones', function (Blueprint $table) {
            $table->id();
            $table->string('folio', 48)->nullable();
            $table->unique(['tenant_id', 'folio']);
            $table->char('ulid', 26);
            $table->unique(['tenant_id', 'ulid']);
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('caja_sesion_id')->nullable()->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('venta_id')->constrained('ventas')->restrictOnDelete()->comment('ticket origen');
            $table->foreignId('venta_sombra_id')->nullable()->constrained('ventas')->nullOnDelete()->comment('venta generada si tipo=cambio; permite devolucion recursiva');
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->enum('tipo', ['devolucion', 'cambio']);
            $table->decimal('monto_devolucion', 12, 2);
            $table->decimal('monto_cambio', 12, 2)->default(0);
            $table->decimal('diferencia', 12, 2)->comment('negativo = reembolso, positivo = cobro adicional');
            $table->text('motivo')->nullable();
            $table->dateTime('fecha')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devoluciones');
    }
};
