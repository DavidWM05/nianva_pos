<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_campanas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete()->comment('Quien envia');
            $table->string('asunto', 200);
            $table->text('mensaje');
            $table->string('segmento', 30)->nullable()->comment('nuevo, frecuente, vip, inactivo, todos');
            $table->json('cliente_ids')->nullable()->comment('Seleccion manual de clientes');
            $table->integer('destinatarios')->default(0)->comment('Cuantos clientes recibieron el envio');
            $table->dateTime('enviado_en')->nullable();
            $table->dateTime('created_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('usuario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_campanas');
    }
};
