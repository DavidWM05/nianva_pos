<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proveedor_id')->nullable()->constrained('proveedores')->nullOnDelete();
            $table->string('referencia', 100)->nullable()->comment('Nombre de persona o entidad');
            $table->decimal('monto', 10, 2);
            $table->decimal('interes', 5, 2)->default(0);
            $table->decimal('monto_a_pagar', 10, 2)->comment('Monto + intereses');
            $table->decimal('saldo_pendiente', 10, 2);
            $table->date('fecha_prestamo');
            $table->date('fecha_vencimiento')->nullable();
            $table->enum('estado', ['activo', 'pagado', 'cancelado'])->default('activo');
            $table->text('notas')->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('tenant_id');
            $table->index('proveedor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamos');
    }
};
