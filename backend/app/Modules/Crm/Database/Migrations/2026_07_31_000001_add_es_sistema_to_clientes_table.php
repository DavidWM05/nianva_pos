<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            // Marca el cliente "Publico General" (ver Crm\Observers\TenantObserver)
            // como registro de sistema -- igual que Rol::es_sistema. El backend
            // rechaza editarlo/desactivarlo (ver ClienteController), y el
            // frontend oculta esas acciones para el en la lista.
            $table->boolean('es_sistema')->default(false)->after('activo');
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropColumn('es_sistema');
        });
    }
};
