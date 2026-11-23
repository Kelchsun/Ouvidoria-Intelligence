// Persistência da demonstração no Supabase (Postgres).
// O navegador nunca fala com o banco: só esta função, com a chave secreta guardada na Vercel.
// Guarda validações, edições, histórico, parâmetros e manifestações novas numa linha da tabela ouv_estado.

const ID = 'demo';
const MAX_BYTES = 900_000;
const MAX_LOG = 1000;
const MAX_EXTRA = 300;

const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = hits.get(ip)?.filter(t => now - t < 60_000) || [];
  win.push(now); hits.set(ip, win);
  if (hits.size > 5000) hits.clear();
  return win.length > 90;
}

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const fail = (message, status) => Object.assign(new Error(message), { status });
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Aceita só o formato esperado e corta o que passar do limite.
export function sanitize(dados) {
  if (!isObj(dados)) throw fail('Formato inválido.', 400);
  const { ov = {}, log = [], cfg = {}, extra = [] } = dados;
  if (!isObj(ov) || !Array.isArray(log) || !isObj(cfg) || !Array.isArray(extra)) throw fail('Formato inválido.', 400);
  const num = (v, d) => (Number.isFinite(+v) ? Math.max(0, Math.min(100, Math.round(+v))) : d);
  const out = {
    ov,
    log: log.slice(0, MAX_LOG),
    cfg: { th: num(cfg.th, 70), ap: num(cfg.ap, 70) },
    extra: extra.slice(0, MAX_EXTRA),
  };
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES) throw fail('Dados grandes demais. Use "Restaurar base inicial".', 413);
  return out;
}

export function database(env = process.env, fetcher = fetch) {
  const base = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw fail('Banco não configurado: cadastre SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel.', 503);
  const headers = { apikey: key, 'content-type': 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = 'Bearer ' + key; // chave antiga service_role (JWT)
  async function request(path, opt = {}) {
    let r;
    try {
      r = await fetcher(base + '/rest/v1/' + path, { ...opt, headers: { ...headers, ...opt.headers }, signal: AbortSignal.timeout(15_000), cache: 'no-store' });
    } catch { throw fail('Não foi possível conectar ao Supabase. Tente novamente.', 503); }
    const body = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) {
      if (body?.code === '42P01' || body?.code === 'PGRST205') throw fail('Execute supabase/01-ouvidoria.sql no SQL Editor do Supabase.', 503);
      throw fail('O banco não concluiu a operação. Confira as variáveis e o SQL no Supabase.', 503);
    }
    return body;
  }
  return {
    async load() {
      const rows = await request(`ouv_estado?id=eq.${ID}&select=dados,atualizado_em`);
      return rows?.[0] || null;
    },
    async save(dados) {
      const atualizado_em = new Date().toISOString();
      await request('ouv_estado?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ id: ID, dados, atualizado_em }]),
      });
      return { atualizado_em };
    },
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { message: 'Origem não permitida.' });
  try {
    const db = database();
    if (req.method === 'GET') {
      const row = await db.load();
      return send(res, 200, { dados: row?.dados || null, atualizado_em: row?.atualizado_em || null });
    }
    if (req.method === 'PUT') {
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
      if (limited(ip)) return send(res, 429, { message: 'Muitas gravações seguidas. Aguarde um minuto.' });
      return send(res, 200, await db.save(sanitize(req.body?.dados)));
    }
    return send(res, 405, { message: 'Use GET ou PUT.' });
  } catch (e) {
    return send(res, e.status || 500, { message: e.status ? e.message : 'Erro inesperado no banco.' });
  }
}
