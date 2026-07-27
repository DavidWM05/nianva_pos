<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabla separada de configuracion_tenant a proposito: seguridad
        // (dias de "recordar este dispositivo") no se mezcla con
        // moneda/ticket/branding.
        Schema::create('configuracion_seguridad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->unsignedTinyInteger('dias_dispositivo_normal')->default(30);
            $table->unsignedTinyInteger('dias_dispositivo_admin')->default(14);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_seguridad');
    }
};
