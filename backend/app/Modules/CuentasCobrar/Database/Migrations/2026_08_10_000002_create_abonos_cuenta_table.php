<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abonos_cuenta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_cobrar_id')->constrained('cuentas_cobrar')->cascadeOnDelete();
            $table->foreignId('caja_sesion_id')->nullable()->constrained('caja_sesiones')->nullOnDelete()
                ->comment('Caja donde se recibio');
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->decimal('monto', 10, 2);
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago')->restrictOnDelete();
            $table->string('referencia', 100)->nullable()
                ->comment('Nro. transferencia, cheque, etc.');
            $table->dateTime('fecha')->useCurrent();

            $table->index('cuenta_cobrar_id');
            $table->index('caja_sesion_id');
            $table->index('usuario_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('abonos_cuenta');
    }
};
