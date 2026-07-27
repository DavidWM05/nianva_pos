<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuario_roles', function (Blueprint $table) {
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->foreignId('rol_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->nullable()
                ->comment('scope opcional: rol aplica solo en esta sucursal')
                ->constrained('sucursales')->cascadeOnDelete();
            $table->dateTime('created_at')->useCurrent();
            $table->primary(['usuario_id', 'rol_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario_roles');
    }
};
