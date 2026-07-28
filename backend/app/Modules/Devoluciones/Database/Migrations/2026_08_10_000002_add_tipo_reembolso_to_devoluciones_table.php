<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->enum('tipo_reembolso', ['efectivo', 'nota_credito'])
                ->default('efectivo')->after('diferencia')
                ->comment('Como se reembolsa al cliente');
            $table->unsignedBigInteger('nota_credito_id')->nullable()->after('tipo_reembolso')
                ->comment('Si tipo_reembolso=nota_credito, la nota de credito generada');
        });
    }

    public function down(): void
    {
        Schema::table('devoluciones', function (Blueprint $table) {
            $table->dropColumn(['tipo_reembolso', 'nota_credito_id']);
        });
    }
};
