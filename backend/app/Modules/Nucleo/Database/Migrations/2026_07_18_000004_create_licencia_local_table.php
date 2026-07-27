<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licencia_local', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->enum('tipo', ['saas', 'pago_unico', 'anual', 'demo']);
            $table->foreignId('plan_id')->nullable()
                ->comment('NULL si no aplica (pago_unico)')
                ->constrained('planes_suscripcion')->nullOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_expiracion')->nullable()->comment('NULL = perpetua (pago_unico)');
            $table->enum('estado', ['activa', 'vencida', 'revocada', 'prueba'])->default('activa');
            $table->text('token_firmado')->comment('JWT firmado por el servidor central');
            $table->dateTime('ultima_validacion')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licencia_local');
    }
};
