<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autorizaciones_supervisor', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->cascadeOnDelete();
            $table->foreignId('solicitante_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained('usuarios')->cascadeOnDelete();
            $table->char('token_hash', 64);
            $table->string('accion', 32);
            $table->char('recurso', 26)->nullable();
            $table->char('huella', 64);
            $table->char('sesion_hash', 64)->nullable();
            $table->timestamp('vence_en')->index();
            $table->timestamp('consumida_en')->nullable();
            $table->unique(['tenant_id', 'token_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autorizaciones_supervisor');
    }
};
