// Servidor local para rodar o projeto no VS Code (sem dependências).
// Serve o index.html e encaminha POST /api/classify para api/classify.js,
// imitando o que a Vercel faz em produção.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from './api/classify.js';

const PORT = Number(process.env.PORT) || 3000;
const index = new URL('./index.html', import.meta.url);

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  if (path === '/api/classify') {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 100_000) { res.statusCode = 413; return res.end(); }
    }
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    return handler(req, res);
  }

  if (path === '/' || path === '/index.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end(await readFile(index));
  }

  res.statusCode = 404;
  res.end('Não encontrado');
});

server.listen(PORT, () => {
  console.log(`Ouvidoria Intelligence rodando em http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('Aviso: GEMINI_API_KEY não definida. O painel abre, mas a classificação com Gemini vai falhar.');
    console.log('Copie .env.example para .env e coloque sua chave.');
  }
});
