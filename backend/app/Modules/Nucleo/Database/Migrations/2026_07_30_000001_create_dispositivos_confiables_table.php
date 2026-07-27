<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispositivos_confiables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('identificador_dispositivo', 64)->unique();
            $table->string('user_agent', 500)->nullable();
            $table->string('ip_registro', 45)->nullable();
            $table->dateTime('fecha_creacion')->useCurrent();
            $table->dateTime('fecha_expiracion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivos_confiables');
    }
};
