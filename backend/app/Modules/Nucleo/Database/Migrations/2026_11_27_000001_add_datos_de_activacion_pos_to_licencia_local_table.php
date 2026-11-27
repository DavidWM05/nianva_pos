<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licencia_local', function (Blueprint $table): void {
            $table->text('codigo_activacion')->nullable();
            $table->dateTime('ultimo_contacto')->nullable();
            $table->date('soporte_hasta')->nullable();
            $table->string('rechazo_remoto', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('licencia_local', function (Blueprint $table): void {
            $table->dropColumn(['codigo_activacion', 'ultimo_contacto', 'soporte_hasta', 'rechazo_remoto']);
        });
    }
};
