import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, database } from '../api/estado.js';

const ENV = { SUPABASE_URL: 'https://abc.supabase.co/', SUPABASE_SECRET_KEY: 'sb_secret_x' };

test('aceita o formato da demonstração e limita os parâmetros', () => {
  const d = sanitize({ ov: { 1: { status: 'Validada' } }, log: [{ id: 1 }], cfg: { th: 140, ap: '60' }, extra: [] });
  assert.deepEqual(d.cfg, { th: 100, ap: 60 });
  assert.equal(d.ov[1].status, 'Validada');
});

test('recusa formato inválido', () => {
  assert.throws(() => sanitize(null), /Formato/);
  assert.throws(() => sanitize({ ov: [], log: [] }), /Formato/);
});

test('corta histórico muito longo', () => {
  const d = sanitize({ log: Array.from({ length: 5000 }, (_, i) => ({ i })) });
  assert.equal(d.log.length, 1000);
});

test('sem variáveis, avisa que o banco não está configurado', () => {
  assert.throws(() => database({}), e => e.status === 503);
});

test('grava com upsert na tabela ouv_estado e chave só no servidor', async () => {
  let call;
  const db = database(ENV, async (url, opt) => { call = { url, opt }; return { ok: true, status: 201, json: async () => null }; });
  await db.save({ ov: {}, log: [], cfg: { th: 70, ap: 70 }, extra: [] });
  assert.equal(call.url, 'https://abc.supabase.co/rest/v1/ouv_estado?on_conflict=id');
  assert.equal(call.opt.method, 'POST');
  assert.equal(call.opt.headers.apikey, 'sb_secret_x');
  assert.equal(call.opt.headers.Authorization, undefined);
  assert.match(call.opt.headers.Prefer, /merge-duplicates/);
  assert.equal(JSON.parse(call.opt.body)[0].id, 'demo');
});

test('lê a linha salva', async () => {
  const db = database(ENV, async () => ({ ok: true, status: 200, json: async () => [{ dados: { ov: {} }, atualizado_em: 't' }] }));
  assert.deepEqual((await db.load()).dados, { ov: {} });
});

test('tabela ausente pede para rodar o SQL', async () => {
  const db = database(ENV, async () => ({ ok: false, status: 404, json: async () => ({ code: 'PGRST205' }) }));
  await assert.rejects(db.load(), /01-ouvidoria\.sql/);
});
