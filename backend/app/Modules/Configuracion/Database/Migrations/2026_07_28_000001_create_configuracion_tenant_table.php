<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_tenant', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->string('moneda', 5)->default('$');
            $table->string('zona_horaria', 64)->default('America/Mexico_City');
            $table->text('mensaje_ticket')->nullable();
            $table->string('logo_url', 500)->nullable();
            $table->boolean('mostrar_rfc')->default(true);
            $table->boolean('mostrar_telefono')->default(true);
            $table->boolean('mostrar_correo')->default(true);
            $table->boolean('backup_auto')->default(false);
            $table->enum('backup_frecuencia', ['diario', 'semanal', 'mensual'])->default('semanal');
            $table->dateTime('backup_ultimo')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_tenant');
    }
};
