<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()
                ->comment('NULL = catalogo global por defecto')
                ->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 80);
            $table->enum('tipo', ['efectivo', 'tarjeta', 'transferencia', 'digital', 'otro']);
            $table->boolean('incluir_en_financiero')->default(true);
            $table->boolean('activo')->default(true);
        });

        // DAT-04b: el método global del fondo inicial y de los gastos existe también sin seeders.
        // El id lo asigna la base; el resolvedor lo busca por nombre y tenant_id NULL.
        DB::table('metodos_pago')->insert([
            'tenant_id' => null,
            'nombre' => 'Efectivo',
            'tipo' => 'efectivo',
            'incluir_en_financiero' => true,
            'activo' => true,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('metodos_pago');
    }
};
