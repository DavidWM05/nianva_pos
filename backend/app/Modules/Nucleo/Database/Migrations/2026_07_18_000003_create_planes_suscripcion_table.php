<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes_suscripcion', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 80);
            $table->string('slug', 80)->unique();
            $table->unsignedInteger('limite_usuarios')->nullable()->comment('NULL = ilimitado');
            $table->unsignedInteger('limite_sucursales')->nullable()->comment('NULL = ilimitado');
            $table->decimal('precio_mensual', 10, 2)->nullable();
            $table->decimal('precio_anual', 10, 2)->nullable();
            $table->json('features')->nullable();
            $table->boolean('activo')->default(true);
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_suscripcion');
    }
};
