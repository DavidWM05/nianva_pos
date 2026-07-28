<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->string('serie_cfdi', 10)->nullable()->after('usuario_anulacion_id')
                ->comment('Serie del CFDI (F, B, etc.)');
            $table->unsignedInteger('folio_cfdi')->nullable()->after('serie_cfdi')
                ->comment('Folio del CFDI');
            $table->string('forma_pago_sat', 10)->nullable()->after('folio_cfdi')
                ->comment('Catalogo SAT: 01=Efectivo, 03=Transferencia, etc.');
            $table->string('metodo_pago_sat', 10)->nullable()->after('forma_pago_sat')
                ->comment('Catalogo SAT: PUE=Pago unico, PPD=Pago diferido');
            $table->string('uso_cfdi', 10)->nullable()->after('metodo_pago_sat')
                ->comment('Catalogo SAT uso del CFDI');
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn(['serie_cfdi', 'folio_cfdi', 'forma_pago_sat', 'metodo_pago_sat', 'uso_cfdi']);
        });
    }
};
