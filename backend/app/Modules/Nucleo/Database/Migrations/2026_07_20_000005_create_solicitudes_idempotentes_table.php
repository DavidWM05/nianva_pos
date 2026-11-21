<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_idempotentes', function (Blueprint $table): void {
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->char('llave', 26);
            $table->char('huella', 64);
            $table->timestamp('vence_en')->index();
            $table->unsignedSmallInteger('estado_http')->nullable();
            $table->longText('cuerpo')->nullable();
            $table->json('cabeceras')->nullable();
            $table->primary(['tenant_id', 'llave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_idempotentes');
    }
};
