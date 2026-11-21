<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folio_contadores', function (Blueprint $table): void {
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->cascadeOnDelete();
            $table->string('tipo', 4);
            $table->unsignedBigInteger('ultimo');
            $table->primary(['tenant_id', 'sucursal_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folio_contadores');
    }
};
