<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bug real encontrado al verificar el contrato contra el servidor de
 * licencias (ver LicenciaClienteService y su reporte): licencia_local.
 * token_firmado se creo NOT NULL, pero LicenciaValidacionService (servidor
 * central) SIEMPRE responde `token: null` para tipo=saas -- ese tipo se
 * valida por consulta directa a BD, nunca firma un JWT. Con la columna
 * NOT NULL, ninguna licencia saas podia guardarse localmente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licencia_local', function (Blueprint $table) {
            $table->text('token_firmado')->nullable()->comment('JWT firmado por el servidor central -- NULL para tipo=saas, nunca firma uno')->change();
        });
    }

    public function down(): void
    {
        Schema::table('licencia_local', function (Blueprint $table) {
            // change() redefine la columna completa: se repiten la nulabilidad y el
            // comentario originales para que el rollback deje la columna como estaba.
            $table->text('token_firmado')->nullable(false)->comment('JWT firmado por el servidor central')->change();
        });
    }
};
