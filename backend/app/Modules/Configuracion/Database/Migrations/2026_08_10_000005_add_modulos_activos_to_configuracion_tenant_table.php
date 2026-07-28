<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table) {
            $table->json('modulos_activos')->nullable()->after('codigo_barras_automatico')
                ->comment('Array de slugs de modulos habilitados para este tenant');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table) {
            $table->dropColumn('modulos_activos');
        });
    }
};
