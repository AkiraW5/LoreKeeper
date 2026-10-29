# Changelog

Todas as mudanças relevantes do LoreKeeper. A seção de cada versão vira a descrição do release no GitHub.

## [1.2.2]

### ✨ Novidades

- **Aviso de atualização dentro do app** — quando sai uma versão nova, aparece um aviso discreto no canto da tela perguntando se você quer atualizar. Nada é baixado nem instalado sem você aceitar.
  - **Atualizar agora** baixa a versão nova com barra de progresso e reinicia o app já atualizado.
  - **Depois** fecha o aviso; ele volta na próxima vez que você abrir o app.
  - **Ver novidades** abre as notas da versão no navegador.

### 🔧 Melhorias

- Releases agora têm descrição detalhada, gerada a partir deste changelog.
- README atualizado: stack atual, atualização automática e como lançar versões.

> Quem está na **1.2.1** recebe esta versão pelo mecanismo antigo (baixa em segundo plano e instala ao fechar o app). A partir da 1.2.2, toda atualização pede confirmação.

## [1.2.1] — 2026-10-29

### ✨ Novidades

- **Atualização automática** — o app instalado (instalador NSIS) passa a buscar novas versões nos Releases do GitHub. A versão portable continua sendo atualizada manualmente.

### 📦 Por dentro

- Electron 44, React 19, Vite 8, TypeScript 6, Recharts 3 e Lucide 1.x.
- `uuid` substituído pelo `crypto.randomUUID` nativo.
- Correções de segurança nas dependências (`npm audit fix`).
- CI usando Node 22, typecheck em todo PR e Dependabot configurado.

## [1.2.0] — 2026-06-07

### ✨ Novidades

- **Em Andamento** — hub central do que você está consumindo agora (jogos, séries, animes, mangás, livros), com card de destaque, barras de progresso, botão +N e mapa de atividade (heatmap) com sequências.
- **Estatísticas** — KPIs e gráficos: conclusões e horas por ano, distribuição de notas, top gêneros/plataformas, dificuldade e comparativo entre mídias.
- **Radar de Hábitos** — insights sobre seu perfil de jogador, sugestões ("faz X meses que você não joga tal plataforma") e curiosidades do seu histórico.
- **Desafio Anual** — metas automáticas por tipo (volume, tempo, variedade, qualidade), sugeridas pelo seu ritmo e com projeção de conclusão.

### 🔧 Melhorias

- **Conquistas** — barra de progresso rumo às conquistas bloqueadas e painel "Próximas a desbloquear".

## [1.1.2] — 2026-06-07

### 🐛 Correções

- Conquistas: a verificação falhava silenciosamente e nunca desbloqueava conquistas nem recalculava XP/nível.
- Sincronização de Missões agora considera apenas os jogos da própria missão.

### 📦 Por dentro

- Atualização de segurança das dependências (Electron, Vite, uuid e transitivas).
- Pipeline de CI/CD com GitHub Actions: build automático e publicação de release ao enviar uma tag.

## [1.1.0] — 2026-03-06

### ✨ Novidades

- Open Library como fonte principal de metadados de livros (com fallback para Google Books).
- Missões com upload/seleção de imagem e listagem com visual de capa.

### 🔧 Melhorias

- **Séries de Jogos** — auto-vínculo mais preciso com jogos zerados, busca por API ao adicionar/editar entradas e capa por entrada.
- **Jogos Zerados** — indicador 🎯 para jogos marcados como missão completa e recontagem do progresso da missão ao criar, editar e excluir.

### 🐛 Correções

- Fluxo de "Missão Completa" em Jogos Zerados.
- `0` aparecendo no checkbox de Séries de Jogos.

## [1.0.0] — 2026-02-14

Primeira versão: jogos (zerados, backlog, séries, roleta), filmes, séries de TV, animes, mangás e livros, dashboard, missões, conquistas, busca de metadados (RAWG, TMDB, Google Books) e banco SQLite local com pasta configurável.
