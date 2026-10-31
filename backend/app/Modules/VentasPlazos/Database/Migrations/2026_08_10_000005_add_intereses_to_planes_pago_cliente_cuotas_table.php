<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planes_pago_cliente_cuotas', function (Blueprint $table) {
            $table->decimal('monto_interes', 10, 2)->default(0)->after('monto')
                ->comment('Porcion de interes en esta cuota');
            $table->decimal('monto_capital', 10, 2)->default(0)->after('monto_interes')
                ->comment('Porcion de capital en esta cuota');
            $table->dateTime('fecha_pago_real')->nullable()->after('fecha_pago');
        });
    }

    public function down(): void
    {
        Schema::table('planes_pago_cliente_cuotas', function (Blueprint $table) {
            $table->dropColumn(['monto_interes', 'monto_capital', 'fecha_pago_real']);
        });
    }
};
