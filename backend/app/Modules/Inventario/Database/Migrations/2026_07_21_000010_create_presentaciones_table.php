<?php

declare(strict_types=1);
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presentaciones', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('variante_id')->constrained('producto_variantes')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->decimal('factor', 14, 3);
            $table->string('codigo_barras', 50)->nullable();
            $table->decimal('precio_venta', 12, 2)->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'codigo_barras']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presentaciones');
    }
};
