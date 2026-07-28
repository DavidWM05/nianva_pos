<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            // CRM Avanzado
            $table->integer('puntos_loyalty')->default(0)->after('es_sistema')
                ->comment('Saldo actual de puntos');
            $table->integer('puntos_acumulados')->default(0)->after('puntos_loyalty')
                ->comment('Total historico de puntos ganados');
            $table->enum('segmento', ['nuevo', 'frecuente', 'vip', 'inactivo'])->nullable()->after('puntos_acumulados')
                ->comment('Segmento calculado automaticamente');
            $table->date('fecha_nacimiento')->nullable()->after('segmento');
            $table->text('notas_crm')->nullable()->after('fecha_nacimiento');

            // Fiscal MX
            $table->string('rfc', 13)->nullable()->after('notas_crm')
                ->comment('Registro Federal de Contribuyentes MX');
            $table->string('regimen_fiscal', 10)->nullable()->after('rfc')
                ->comment('Catalogo SAT: 601=General, 605=Sueldos, etc.');
            $table->string('uso_cfdi', 10)->nullable()->after('regimen_fiscal')
                ->comment('Catalogo SAT: G01=Adquisicion, G03=Gastos, etc.');
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropColumn([
                'puntos_loyalty', 'puntos_acumulados', 'segmento',
                'fecha_nacimiento', 'notas_crm', 'rfc', 'regimen_fiscal', 'uso_cfdi',
            ]);
        });
    }
};
