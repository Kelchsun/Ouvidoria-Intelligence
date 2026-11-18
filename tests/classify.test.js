import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, redact, validate } from '../api/classify.js';

const TEXTO = 'Bati o carro e a oficina diz que a seguradora ainda não autorizou o conserto do farol. Já faz 20 dias.';
const ok = obj => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
const BOM = { produto: 'Auto', natureza: 'Sinistro', motivo: 'Demora na análise do sinistro', confianca: 91, ambiguo: false, justificativa: 'Carro, oficina e conserto indicam sinistro de auto.', evidencias: ['oficina diz que a seguradora ainda não autorizou', 'trecho que não existe'], alternativa: '' };

test('remove CPF, e-mail e telefone antes de enviar', () => {
  const r = redact('Meu CPF é 123.456.789-09, e-mail ana@exemplo.com e celular (21) 98765-4321.');
  assert.equal(r.removed, 3);
  assert.ok(!/123\.456|ana@|98765/.test(r.text));
});

test('aceita só categorias da lista e só evidências literais', () => {
  const v = validate(BOM, TEXTO);
  assert.equal(v.produto, 'Auto');
  assert.deepEqual(v.evid, ['oficina diz que a seguradora ainda não autorizou']);
  assert.throws(() => validate({ ...BOM, produto: 'Saúde' }, TEXTO));
});

test('limita a confiança entre 0 e 100', () => {
  assert.equal(validate({ ...BOM, confianca: 140 }, TEXTO).conf, 100);
  assert.equal(validate({ ...BOM, confianca: -5 }, TEXTO).conf, 0);
});

test('envia instruções, schema JSON e o texto delimitado como dado', async () => {
  let body;
  const r = await classify({ texto: TEXTO, env: { GEMINI_API_KEY: 'k' }, fetcher: async (url, opt) => { body = JSON.parse(opt.body); return ok(BOM)(); } });
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.ok(body.contents[0].parts[0].text.startsWith('<manifestacao>'));
  assert.match(body.systemInstruction.parts[0].text, /nunca instrução/);
  assert.equal(r.conf, 91);
  assert.equal(r.modelo, 'gemini-3.5-flash-lite');
});

test('sem chave, explica o que configurar', async () => {
  await assert.rejects(classify({ texto: TEXTO, env: {} }), e => e.status === 503 && /GEMINI_API_KEY/.test(e.message));
});

test('cota esgotada vira mensagem clara', async () => {
  await assert.rejects(classify({ texto: TEXTO, env: { GEMINI_API_KEY: 'k' }, fetcher: async () => ({ ok: false, status: 429 }) }), /Cota/);
});

test('resposta fora do formato é rejeitada', async () => {
  const bad = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'não é json' }] } }] }) });
  await assert.rejects(classify({ texto: TEXTO, env: { GEMINI_API_KEY: 'k' }, fetcher: bad }), /fora do formato/);
});
