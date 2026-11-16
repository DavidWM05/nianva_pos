<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listas_precio', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 120);
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nombre']);
        });
        Schema::create('lista_precio_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lista_precio_id')->constrained('listas_precio')->cascadeOnDelete();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->cascadeOnDelete();
            $table->foreignId('variante_id')->nullable()->constrained('producto_variantes')->cascadeOnDelete();
            $table->decimal('precio', 12, 2);
            $table->timestamps();
            $table->unique(['tenant_id', 'lista_precio_id', 'producto_id']);
            $table->unique(['tenant_id', 'lista_precio_id', 'variante_id']);
        });
        Schema::create('lista_precio_clientes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lista_precio_id')->constrained('listas_precio')->cascadeOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'cliente_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lista_precio_clientes');
        Schema::dropIfExists('lista_precio_items');
        Schema::dropIfExists('listas_precio');
    }
};
