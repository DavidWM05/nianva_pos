<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Una sola fila, global -- NO tiene tenant_id a proposito. El identificador
 * de instalacion identifica el despliegue fisico/logico de Nucleo en si
 * (potencialmente sirviendo a varios tenants desde la misma base de datos
 * compartida), no un tenant en particular -- ver InstalacionNucleo::identificador()
 * y el reporte del cliente de licenciamiento.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('instalacion_nucleo', function (Blueprint $table) {
            $table->id();
            $table->uuid('identificador')->unique();
            $table->dateTime('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instalacion_nucleo');
    }
};
