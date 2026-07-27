<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table) {
            // Si esta activo, ProductoVarianteController genera el codigo de
            // barras de una variante nueva en vez de aceptar uno a mano (ver
            // el reporte) -- default false para no cambiar el comportamiento
            // de un tenant existente sin que lo pida explicitamente.
            $table->boolean('codigo_barras_automatico')->default(false)->after('backup_ultimo');
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table) {
            $table->dropColumn('codigo_barras_automatico');
        });
    }
};
