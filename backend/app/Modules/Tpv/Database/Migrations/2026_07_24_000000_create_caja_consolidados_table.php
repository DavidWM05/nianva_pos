<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caja_consolidados', function (Blueprint $table): void {
            $table->id();
            $table->char('ulid', 26)->unique();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->date('fecha_operativa');
            $table->foreignId('original_id')->nullable()->constrained('caja_consolidados')->restrictOnDelete();
            $table->foreignId('supervisor_apertura_id')->nullable()->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->dateTime('fecha_cierre');
            $table->decimal('total_teorico', 12, 2);
            $table->decimal('total_contado', 12, 2);
            $table->decimal('diferencia', 12, 2);
            $table->date('fecha_original')->nullable()
                ->virtualAs('CASE WHEN original_id IS NULL THEN fecha_operativa ELSE NULL END');
            $table->unique(['sucursal_id', 'fecha_original']);
            $table->index(['sucursal_id', 'fecha_operativa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caja_consolidados');
    }
};
