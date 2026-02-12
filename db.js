const { Pool } = require('pg');

/**
 * Conexión Postgres (Supabase-friendly) ✅
 *
 * Objetivo: que funcione LOCALMENTE apuntando a Supabase y también en Render,
 * sin tocar nada más que el .env.
 *
 * Reglas:
 * - Si DATABASE_SSL=true -> fuerza SSL (rejectUnauthorized:false)
 * - Si DATABASE_SSL=false -> sin SSL (útil para Postgres local)
 * - Si DATABASE_SSL no está -> auto: SSL para hosts tipo *.supabase.co, no SSL para localhost
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no está definida. Configurala en .env (local) o en Environment Variables (Render).'
  );
}

const rawUrl = String(process.env.DATABASE_URL).trim();

// Acepta true/false, 1/0, yes/no, on/off
const sslFlagRaw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
const hasExplicitFlag = sslFlagRaw.length > 0;
const sslEnabledByFlag = !['false', '0', 'no', 'off'].includes(sslFlagRaw);

// Detect host desde la URL (para auto SSL)
let hostname = '';
try {
  const u = new URL(rawUrl);
  hostname = (u.hostname || '').toLowerCase();
} catch {
  // Si la URL es inválida, pg igual va a tirar error después; dejamos hostname vacío.
}

const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
const isSupabaseHost = hostname.endsWith('.supabase.co') || hostname.includes('supabase');

// AUTO: si no hay flag explícito, activamos SSL solo para Supabase/hosts remotos conocidos
const sslEnabled = hasExplicitFlag ? sslEnabledByFlag : (isSupabaseHost && !isLocalHost);

// Para Supabase / Render: rejectUnauthorized:false evita errores por cadenas intermedias
const ssl = sslEnabled ? { rejectUnauthorized: false } : false;

// Pool: límites sanos para no “matar” la DB
const pool = new Pool({
  connectionString: rawUrl,
  ssl,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_TIMEOUT_MS || 10000),
});

pool.on('error', (err) => {
  console.error('[db] Pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
