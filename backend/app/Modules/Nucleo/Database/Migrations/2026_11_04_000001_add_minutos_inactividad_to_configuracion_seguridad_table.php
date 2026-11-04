<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracion_seguridad', function (Blueprint $table) {
            $table->unsignedSmallInteger('minutos_inactividad')->default(30);
        });
    }

    public function down(): void
    {
        Schema::table('configuracion_seguridad', function (Blueprint $table) {
            $table->dropColumn('minutos_inactividad');
        });
    }
};
