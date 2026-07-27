<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()
                ->comment('NULL = superadmin')
                ->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->nullable()
                ->constrained('sucursales')->nullOnDelete();
            $table->string('nombre', 150);
            $table->string('apellido', 150)->nullable();
            $table->string('alias', 50)->nullable();
            $table->string('correo', 150)->unique();
            $table->string('password', 255);
            $table->string('telefono', 20)->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->boolean('activo')->default(true);
            $table->dateTime('ultimo_login')->nullable();
            $table->rememberToken();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->dateTime('deleted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
