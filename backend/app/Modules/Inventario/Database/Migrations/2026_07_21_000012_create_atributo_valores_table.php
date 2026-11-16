<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ARQ-07: valores posibles de un atributo. El tenant sale del atributo; tenant_id es una copia
 * (como en producto_variantes) para el binding y la unicidad con tenant (DAT-09).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('atributo_valores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('atributo_id')->constrained('atributos')->cascadeOnDelete();
            $table->string('valor', 60);
            $table->unsignedSmallInteger('orden')->default(0);
            $table->dateTime('created_at')->useCurrent();

            $table->unique(['tenant_id', 'atributo_id', 'valor']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('atributo_valores');
    }
};
