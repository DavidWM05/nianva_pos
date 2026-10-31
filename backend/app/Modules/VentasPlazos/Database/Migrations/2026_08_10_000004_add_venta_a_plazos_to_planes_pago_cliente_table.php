<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planes_pago_cliente', function (Blueprint $table) {
            $table->foreignId('venta_id')->nullable()->after('cliente_id')
                ->constrained('ventas')->nullOnDelete()
                ->comment('Venta que origina el plan');
            $table->decimal('interes_total', 10, 2)->default(0)->after('monto_total');
            $table->decimal('tasa_interes', 5, 2)->nullable()->after('interes_total')
                ->comment('Tasa de interes porcentual ej: 5.00 = 5%');
            $table->unsignedInteger('numero_cuotas')->default(1)->after('tasa_interes');
            $table->enum('periodicidad', ['semanal', 'quincenal', 'mensual'])->default('mensual')
                ->after('numero_cuotas');
        });
    }

    public function down(): void
    {
        Schema::table('planes_pago_cliente', function (Blueprint $table) {
            $table->dropForeign(['venta_id']);
            $table->dropColumn(['venta_id', 'interes_total', 'tasa_interes', 'numero_cuotas', 'periodicidad']);
        });
    }
};
