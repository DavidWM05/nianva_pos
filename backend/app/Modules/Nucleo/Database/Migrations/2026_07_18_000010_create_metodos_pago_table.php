<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()
                ->comment('NULL = catalogo global por defecto')
                ->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 80);
            $table->enum('tipo', ['efectivo', 'tarjeta', 'transferencia', 'digital', 'otro']);
            $table->boolean('incluir_en_financiero')->default(true);
            $table->boolean('activo')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metodos_pago');
    }
};
