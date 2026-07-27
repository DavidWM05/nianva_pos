<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kardex', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variante_id')->constrained('producto_variantes')->restrictOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->enum('tipo', ['entrada', 'salida']);
            $table->integer('cantidad');
            $table->enum('motivo', ['venta', 'compra', 'devolucion', 'merma', 'ajuste', 'apartado']);
            $table->string('referencia_tabla', 60)->nullable()->comment('ej. ventas, compras, devoluciones');
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->integer('stock_resultante')->comment('foto del saldo tras este movimiento, no es fuente de verdad');
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('fecha')->useCurrent();

            $table->index(['variante_id', 'sucursal_id'], 'idx_kardex_variante_sucursal');
            $table->index(['referencia_tabla', 'referencia_id'], 'idx_kardex_referencia');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kardex');
    }
};
