# Ouvidoria Intelligence

Painel de demonstração para organizar e classificar manifestações de ouvidoria de seguros.
Usa **150 manifestações fictícias**. Nenhum dado é de clientes reais.

## Como funciona

| Parte | Tecnologia | Onde está |
|---|---|---|
| Tela (front-end) | HTML, CSS e JavaScript puro, gráficos em SVG | `index.html` |
| Classificação com IA | Função serverless na Vercel que chama a API do Gemini (`gemini-3.5-flash-lite`) | `api/classify.js` |
| Banco de dados | Supabase (Postgres), acessado só pelo servidor | `api/estado.js`, `supabase/01-ouvidoria.sql` |
| Agentes de IA do portfólio | Função que roda 4 agentes com function calling do Gemini (página em portfolioaibuilder.vercel.app/agentes) | `api/agente.js`, `api/_agentes.js` |
| Testes | `node --test` | `tests/` |

- O Gemini só sugere. Confiança abaixo do limite (padrão 70%) ou caso ambíguo vai para a fila. Toda validação é humana.
- CPF, e-mail e telefone são removidos antes de enviar o texto ao Gemini.
- Validações, edições, histórico e novas manifestações ficam no Supabase. O navegador não guarda dados.

## Ativar o banco (uma vez)

1. No Supabase, abra o projeto (pode ser o mesmo da SEMAD) e vá em **SQL Editor > New query**.
2. Cole o conteúdo de `supabase/01-ouvidoria.sql` e clique em **Run**.
3. Na Vercel, projeto **ouvidoriaintelligence**, vá em **Settings > Environment Variables** e crie, marcando **Production** e **Preview**:
   - `SUPABASE_URL`: a URL do projeto, como `https://abc.supabase.co`
   - `SUPABASE_SECRET_KEY`: a Secret key (ou a antiga `service_role`). Marque como Sensitive.
4. Faça um novo deploy (**Deployments > ⋯ > Redeploy**).
5. Abra o site, vá em **Configurações** e confira a linha "Conectado".

Sem essas variáveis, o painel funciona, mas as alterações valem só até fechar a aba.

## Variáveis

| Nome | Para quê |
|---|---|
| `GEMINI_API_KEY` | Classificação com o Gemini |
| `GEMINI_MODEL` | Opcional. Padrão `gemini-3.5-flash-lite` |
| `SUPABASE_URL` | Banco de dados |
| `SUPABASE_SECRET_KEY` | Banco de dados (só no servidor, nunca no navegador) |

## Testes

```bash
npm test
```
