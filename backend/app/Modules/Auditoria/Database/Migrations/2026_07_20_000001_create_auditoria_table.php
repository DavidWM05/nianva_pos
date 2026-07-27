<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tabla_afectada', 100);
            $table->unsignedBigInteger('registro_id');
            $table->enum('accion', ['create', 'update', 'delete']);
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->json('cambios')->nullable()->comment('antes/despues por campo');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->dateTime('created_at')->useCurrent();

            $table->index(['tabla_afectada', 'registro_id'], 'idx_auditoria_tabla_registro');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria');
    }
};
