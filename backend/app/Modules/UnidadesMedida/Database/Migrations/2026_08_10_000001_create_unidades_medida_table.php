<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unidades_medida', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete()
                ->comment('NULL = catalogo global, visible para todos los tenants');
            $table->string('nombre', 50);
            $table->string('abreviatura', 10);
            $table->enum('tipo', ['entero', 'fraccionario'])->default('entero');
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'abreviatura']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades_medida');
    }
};
