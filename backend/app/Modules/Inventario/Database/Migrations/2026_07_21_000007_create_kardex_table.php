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
            $table->decimal('cantidad', 14, 3);
            $table->enum('motivo', ['saldo_inicial', 'venta', 'compra', 'devolucion', 'merma', 'ajuste', 'apartado']);
            $table->string('referencia_tabla', 60)->nullable()->comment('ej. ventas, compras, devoluciones');
            $table->unsignedBigInteger('referencia_id')->nullable();
            // DAT-04: libro de stock de solo inserción; inventario_stock.stock_actual es su proyección.
            $table->decimal('stock_antes', 14, 3);
            $table->decimal('stock_despues', 14, 3);
            // Null solo en un SALDO_INICIAL que crea el sistema sin usuario (seeder o preparación).
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->restrictOnDelete();
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
