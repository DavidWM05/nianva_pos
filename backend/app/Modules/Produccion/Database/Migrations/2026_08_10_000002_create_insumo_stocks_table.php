<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insumo_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('insumo_id')->constrained('insumos')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->cascadeOnDelete();
            $table->decimal('cantidad', 10, 4)->default(0);
            $table->string('lote', 50)->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('insumo_id');
            $table->index('sucursal_id');
            $table->unique(['insumo_id', 'sucursal_id', 'lote']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insumo_stocks');
    }
};
