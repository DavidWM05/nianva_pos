<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table): void {
            $table->decimal('margen_descuento_supervisor', 12, 2)->nullable();
            $table->decimal('umbral_descuadre_supervisor', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_tenant', function (Blueprint $table): void {
            $table->dropColumn(['margen_descuento_supervisor', 'umbral_descuadre_supervisor']);
        });
    }
};
