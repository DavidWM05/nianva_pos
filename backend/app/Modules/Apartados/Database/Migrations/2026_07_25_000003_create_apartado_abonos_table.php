<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartado_abonos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('apartado_id')->constrained('apartados')->cascadeOnDelete();
            $table->decimal('monto', 10, 2);
            $table->dateTime('fecha')->useCurrent();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->text('notas')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartado_abonos');
    }
};
