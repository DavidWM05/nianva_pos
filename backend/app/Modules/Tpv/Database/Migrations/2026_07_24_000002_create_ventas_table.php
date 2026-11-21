<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $sqlite = Schema::getConnection()->getDriverName() === 'sqlite';
        $condicionCaja = 'es_venta_sombra = 1 OR caja_sesion_id IS NOT NULL';
        Schema::create('ventas', function (Blueprint $table) use ($sqlite, $condicionCaja) {
            $table->id();
            $table->char('ulid', 26);
            $table->unique(['tenant_id', 'ulid']);
            $table->foreignId('lista_precio_id')->nullable()->constrained('listas_precio')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucursal_id')->constrained('sucursales')->restrictOnDelete();
            $table->foreignId('caja_sesion_id')->nullable()->constrained('caja_sesiones')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('cliente_id')->constrained('clientes')->restrictOnDelete();
            $table->foreignId('cupon_id')->nullable()->constrained('cupones')->nullOnDelete();
            $table->dateTime('fecha')->useCurrent();
            $table->decimal('total', 12, 2);
            $table->decimal('descuento_cupon', 12, 2)->default(0);
            $table->decimal('descuento_manual', 12, 2)->default(0);
            $table->decimal('abono_previo', 12, 2)->default(0)->comment('liquidacion de apartado: lo ya cobrado antes');
            // SQLite acepta el CHECK en la columna; MySQL exige que las referencias
            // a otras columnas se declaren como restricción de tabla.
            $sombra = $sqlite
                ? $table->rawColumn('es_venta_sombra', 'boolean CHECK ('.$condicionCaja.')')
                : $table->boolean('es_venta_sombra');
            $sombra->default(false)->comment('true = venta generada por un cambio; excluir de reportes financieros');
            $table->enum('estado', ['completada', 'anulada'])->default('completada');
            $table->string('motivo_anulacion', 255)->nullable();
            $table->dateTime('fecha_anulacion')->nullable();
            $table->foreignId('usuario_anulacion_id')->nullable()->constrained('usuarios')->nullOnDelete();
        });
        if (! $sqlite) {
            Schema::getConnection()->statement('ALTER TABLE ventas ADD CONSTRAINT ventas_caja_o_sombra CHECK ('.$condicionCaja.')');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
