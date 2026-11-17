<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ARQ-07: atributos genericos de variante (cada giro trae los suyos). El giro los define como
 * datos (perfil de giro), nunca como columnas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('atributos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 60);
            $table->unsignedSmallInteger('orden')->default(0)->comment('orden en el nombre de la variante');
            $table->dateTime('created_at')->useCurrent();

            $table->unique(['tenant_id', 'nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('atributos');
    }
};
