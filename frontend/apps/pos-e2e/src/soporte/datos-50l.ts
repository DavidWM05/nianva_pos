import { execFileSync } from 'node:child_process';
import path from 'node:path';

interface Datos50l {
  origen: string;
  destino: string;
  unidad: string;
  empleado: string;
}

/** Crea únicamente los datos auxiliares de los flujos en la SQLite del e2e. */
export function prepararDatos50l(): Datos50l {
  const backend = path.resolve(__dirname, '../../../../../backend');
  const codigo = [
    'require ' +
      JSON.stringify(path.join(backend, 'vendor/autoload.php')) +
      ';',
    '$app = require ' +
      JSON.stringify(path.join(backend, 'bootstrap/app.php')) +
      ';',
    '$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();',
    '$u = App\\Modules\\Nucleo\\Models\\Usuario::sinTenant()->where("correo", "vendedor@abarrotes.test")->firstOrFail();',
    '$unidad = App\\Modules\\UnidadesMedida\\Models\\UnidadMedida::withoutGlobalScopes()->where("abreviatura", "kg")->firstOrFail();',
    '$sufijo = uniqid(); $nombres = [];',
    'foreach (["Origen", "Destino"] as $nombre) {',
    '$p = App\\Modules\\Inventario\\Models\\Producto::factory()->create(["tenant_id"=>$u->tenant_id, "nombre"=>$nombre." 50l ".$sufijo, "precio_compra"=>5, "precio_venta"=>10]);',
    '$v = App\\Modules\\Inventario\\Models\\ProductoVariante::factory()->create(["producto_id"=>$p->id, "talla"=>"Unidad 50l", "color"=>null, "unidad_medida_id"=>$unidad->id]);',
    'App\\Modules\\Inventario\\Models\\InventarioStock::factory()->create(["sucursal_id"=>$u->sucursal_id, "variante_id"=>$v->id, "stock_actual"=>100]);',
    '$nombres[] = $p->nombre; }',
    '$e = App\\Modules\\Nucleo\\Models\\Usuario::factory()->create(["tenant_id"=>$u->tenant_id, "sucursal_id"=>$u->sucursal_id, "nombre"=>"Empleado 50l ".$sufijo, "apellido"=>"Prueba"]);',
    'echo json_encode(["origen"=>$nombres[0],"destino"=>$nombres[1],"unidad"=>$unidad->nombre,"empleado"=>$e->nombre]);',
  ].join('\n');
  return JSON.parse(
    execFileSync('php', ['-r', codigo], {
      cwd: backend,
      encoding: 'utf8',
      env: {
        ...process.env,
        APP_ENV: 'local',
        APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: path.join(
          backend,
          'storage/framework/testing/pos-e2e.sqlite',
        ),
        CACHE_STORE: 'array',
        QUEUE_CONNECTION: 'sync',
        HASH_DRIVER: 'bcrypt',
        BCRYPT_ROUNDS: '4',
      },
    }),
  ) as Datos50l;
}
