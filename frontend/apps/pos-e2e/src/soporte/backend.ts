import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PASSWORD } from './sesion';

/**
 * 50j: datos que el e2e de auth no puede obtener por la API (el secreto TOTP del admin, un
 * token de restablecimiento, un usuario sin 2FA). Corre PHP contra la misma SQLite y la misma
 * APP_KEY que levanta backend-server.mjs (ver playwright.config.ts), nunca contra la base de
 * desarrollo.
 */
const backendRoot = path.resolve(__dirname, '../../../../../backend');
const entorno = {
  ...process.env,
  APP_ENV: 'local',
  APP_KEY: `base64:${Buffer.alloc(32, 7).toString('base64')}`,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: path.join(backendRoot, 'storage/framework/testing/pos-e2e.sqlite'),
  CACHE_STORE: 'array',
  QUEUE_CONNECTION: 'sync',
  // El mismo hash que el backend del e2e (playwright.config.ts): un usuario creado aquí con
  // otro driver no podría entrar.
  HASH_DRIVER: 'bcrypt',
  BCRYPT_ROUNDS: '4',
};

/** Ejecuta `codigo` con Laravel ya arrancado y devuelve lo que imprime. */
function enBackend(codigo: string): string {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'pos-e2e-'));
  const script = path.join(carpeta, 'script.php');
  writeFileSync(
    script,
    [
      '<?php',
      `require ${JSON.stringify(path.join(backendRoot, 'vendor/autoload.php'))};`,
      `$app = require ${JSON.stringify(path.join(backendRoot, 'bootstrap/app.php'))};`,
      '$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();',
      'use App\\Modules\\Nucleo\\Models\\Usuario;',
      codigo,
    ].join('\n'),
  );

  try {
    return execFileSync('php', [script], { cwd: backendRoot, env: entorno, encoding: 'utf8' }).trim();
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

const usuario = (correo: string) => `Usuario::sinTenant()->where('correo', ${JSON.stringify(correo)})->firstOrFail()`;

/** Secreto TOTP (base32) de un usuario con 2FA confirmado. */
export function secretoDosFactor(correo: string): string {
  return enBackend(`echo ${usuario(correo)}->two_factor_secret;`);
}

/** Token de restablecimiento de contrasena, como el del enlace del correo. */
export function tokenDeRestablecimiento(correo: string): string {
  return enBackend(`echo Illuminate\\Support\\Facades\\Password::broker()->createToken(${usuario(correo)});`);
}

/**
 * Crea `correo` con el tenant, la sucursal y los roles de `base`, la contrasena del escenario y
 * sin 2FA. Si ya existe, lo deja igual que recien creado (asi el spec se puede repetir).
 */
export function crearUsuarioComo(base: string, correo: string): void {
  enBackend(`
    $base = ${usuario(base)};
    $nuevo = Usuario::sinTenant()->where('correo', ${JSON.stringify(correo)})->first()
        ?? Usuario::factory()->create([
            'tenant_id' => $base->tenant_id,
            'sucursal_id' => $base->sucursal_id,
            'correo' => ${JSON.stringify(correo)},
            'nombre' => 'E2e',
            'apellido' => 'Auth',
        ]);
    $nuevo->forceFill([
        'password' => ${JSON.stringify(PASSWORD)},
        'two_factor_secret' => null,
        'two_factor_confirmed_at' => null,
        'two_factor_recovery_codes' => null,
    ])->save();
    $nuevo->roles()->sync($base->roles()->pluck('roles.id'));
  `);
}

/** Codigo TOTP de 6 digitos (RFC 6238, SHA-1, 30 s), como el de una app de autenticacion. */
export function codigoTotp(secreto: string, instante = Date.now()): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secreto.replace(/=+$/, '').toUpperCase()]
    .map((letra) => alfabeto.indexOf(letra).toString(2).padStart(5, '0'))
    .join('');
  const clave = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(instante / 30000)));
  const hmac = createHmac('sha1', clave).update(contador).digest();
  const inicio = hmac[hmac.length - 1] & 0xf;

  return String((hmac.readUInt32BE(inicio) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
