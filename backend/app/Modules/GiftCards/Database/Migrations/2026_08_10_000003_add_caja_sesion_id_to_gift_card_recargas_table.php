<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gift_card_recargas', function (Blueprint $table) {
            $table->foreignId('caja_sesion_id')->nullable()->after('gift_card_id')
                ->constrained('caja_sesiones')->nullOnDelete()
                ->comment('Caja donde se realizo la recarga');
        });
    }

    public function down(): void
    {
        Schema::table('gift_card_recargas', function (Blueprint $table) {
            $table->dropForeign(['caja_sesion_id']);
            $table->dropColumn('caja_sesion_id');
        });
    }
};
