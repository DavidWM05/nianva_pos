<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('apartado_abonos', function (Blueprint $table) {
            $table->id();
            $table->char('ulid', 26)->unique();
            $table->foreignId('caja_sesion_id')->nullable()->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('apartado_id')->constrained('apartados')->cascadeOnDelete();
            $table->decimal('monto', 12, 2);
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
