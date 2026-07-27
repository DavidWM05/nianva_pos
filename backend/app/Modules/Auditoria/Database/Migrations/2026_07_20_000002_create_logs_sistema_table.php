<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_sistema', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('producto_origen', 80);
            $table->string('modulo_origen', 80);
            $table->enum('nivel', ['info', 'warning', 'error', 'critical']);
            $table->string('mensaje', 500);
            $table->text('stack_trace')->nullable();
            $table->json('contexto')->nullable();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->boolean('resuelto')->default(false);
            $table->dateTime('created_at')->useCurrent();

            $table->index('nivel', 'idx_logs_sistema_nivel');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_sistema');
    }
};
