<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nota_credito_usos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nota_credito_id')->constrained('notas_credito')->cascadeOnDelete();
            // DAT-04: es el libro de la nota (solo inserción); notas_credito.saldo_disponible es su
            // proyección. saldo_inicial (sin venta) abre el libro con el monto original; cada uso lo baja.
            $table->enum('tipo', ['saldo_inicial', 'uso']);
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->restrictOnDelete();
            $table->decimal('monto_usado', 12, 2);
            $table->decimal('saldo_antes', 12, 2);
            $table->decimal('saldo_despues', 12, 2);
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('created_at')->useCurrent();

            $table->index('nota_credito_id');
            $table->index('venta_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nota_credito_usos');
    }
};
