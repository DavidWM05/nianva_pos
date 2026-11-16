<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** ARQ-07: el valor que tiene una variante para cada atributo; a lo mas uno por atributo. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variante_atributo_valores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('variante_id')->constrained('producto_variantes')->cascadeOnDelete();
            $table->foreignId('atributo_id')->constrained('atributos')->restrictOnDelete();
            $table->foreignId('atributo_valor_id')->constrained('atributo_valores')->restrictOnDelete();

            $table->unique(['variante_id', 'atributo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variante_atributo_valores');
    }
};
