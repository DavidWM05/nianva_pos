<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()
                ->comment('NULL = rol de sistema, reusable por todos los tenants')
                ->constrained('tenants')->cascadeOnDelete();
            $table->string('nombre', 80);
            $table->text('descripcion')->nullable();
            $table->boolean('es_sistema')->default(false);
            $table->dateTime('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
