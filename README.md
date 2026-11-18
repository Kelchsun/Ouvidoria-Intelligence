# Ouvidoria Intelligence

Painel de Ouvidoria com classificação de manifestações pelo Gemini e revisão humana.

## Rodar no VS Code

Requisito: [Node.js](https://nodejs.org) 22.9 ou mais novo (recomendado 24).

1. Abra esta pasta no VS Code (`Arquivo > Abrir Pasta`).
2. Copie `.env.example` para `.env` e coloque sua chave do Gemini em `GEMINI_API_KEY`
   (gere em https://aistudio.google.com/apikey).
3. No terminal do VS Code (`Ctrl + '`), rode:

   ```
   npm start
   ```

4. Abra http://localhost:3000 no navegador.

Sem a chave, o painel abre normalmente; só a classificação com Gemini mostra erro.

Testes: `npm test`.

## Estrutura

- `index.html` — o painel inteiro (HTML, CSS e JS).
- `api/classify.js` — chamada ao Gemini (na Vercel vira a rota `/api/classify`).
- `server.js` — servidor local que imita a Vercel. Não precisa de `npm install`.
