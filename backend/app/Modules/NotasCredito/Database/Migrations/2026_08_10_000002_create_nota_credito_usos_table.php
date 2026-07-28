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
            $table->foreignId('venta_id')->constrained('ventas')->restrictOnDelete();
            $table->decimal('monto_usado', 10, 2);
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
