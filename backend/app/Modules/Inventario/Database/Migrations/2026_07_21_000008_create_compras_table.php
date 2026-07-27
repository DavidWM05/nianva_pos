<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proveedor_id')->constrained('proveedores')->restrictOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('numero_comprobante', 60)->nullable();
            $table->string('comprobante_url', 500)->nullable();
            $table->decimal('total', 10, 2);
            $table->dateTime('fecha')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compras');
    }
};
