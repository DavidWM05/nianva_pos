<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete()
                ->comment('NULL = cotizacion sin cliente');
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('numero_cotizacion', 30);
            $table->decimal('total', 10, 2);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->integer('validez_dias')->unsigned()->default(15);
            $table->enum('estado', ['pendiente', 'convertida', 'vencida', 'anulada'])->default('pendiente');
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->nullOnDelete()
                ->comment('Venta generada al convertir');
            $table->text('observaciones')->nullable();
            $table->date('fecha_vencimiento')->nullable()
                ->comment('Se calcula al crear: fecha_creacion + validez_dias');
            $table->string('uso_cfdi', 10)->nullable()
                ->comment('Catalogo SAT uso del CFDI, para pre-llenar al convertir');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('tenant_id');
            $table->index('cliente_id');
            $table->index('venta_id');
            $table->unique(['tenant_id', 'numero_cotizacion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizaciones');
    }
};
