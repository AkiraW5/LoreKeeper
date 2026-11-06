# Changelog

Todas as mudanças relevantes do LoreKeeper. A seção de cada versão vira a descrição do release no GitHub.

## [1.4.0]

### ✨ Novidades

- **Notificação de conquistas** — ao desbloquear uma conquista, aparece um aviso no canto da tela com ícone, nome, XP e raridade, com um somzinho que fica mais elaborado quanto mais rara ela for.
  - As conquistas agora são verificadas na hora em que você salva algo, sem precisar abrir a página de Conquistas.
  - Várias de uma vez entram em fila. Clicar no aviso leva para a página de Conquistas.
  - O som pode ser desligado nas Configurações.
- **Procurar atualizações** — botão nas Configurações que diz na hora se há versão nova.
- **Busca de mangás pelo AniList** — capas em alta resolução, autor, tipo (Mangá/Manhwa/Manhua), gênero, capítulos e volumes preenchidos automaticamente.

### 🐛 Correções

- **Busca de livros quase nunca achava nada** — um filtro de idioma errado fazia o Open Library sempre voltar vazio. Agora ele e o Google Books são consultados juntos, priorizando resultados com capa.
- Capas de livros do Open Library em resolução maior.
- A nota 11 agora acompanha a mídia: "Filme da vida", "Anime da vida", "Livro da vida"... (antes era sempre "Jogo da vida").

> Na primeira abertura desta versão, as conquistas que você já tinha atingido e ainda não estavam registradas aparecem em sequência.

## [1.3.1]

### 🐛 Correções

- **Capas do IGDB em alta resolução** — as capas de jogos agora vêm em 528×748 (antes 264×374). As capas salvas na 1.3.0 são atualizadas automaticamente ao abrir o app.

## [1.3.0]

### ✨ Novidades

- **IGDB como fonte de jogos** — a busca de jogos agora usa o IGDB (da Twitch), com capas oficiais em formato de caixa, descrição, desenvolvedora, gêneros e plataformas.
  - **RAWG como reserva:** se o IGDB não responder, a busca cai automaticamente no RAWG. Quem só tem a chave do RAWG continua funcionando como antes.
  - Para ativar, registre um app em [dev.twitch.tv/console](https://dev.twitch.tv/console) e cole o Client ID e o Client Secret nas Configurações.
- **Nova tela de Configurações** — cada fonte de metadados (IGDB, RAWG, TMDB, Google Books) tem seu card com status "Ativo" / "Sem chave", e há um atalho para as novidades da versão.

### 🔧 Melhorias

- A busca não fica mais carregando para sempre quando um serviço trava: todas as consultas desistem depois de 8 segundos.
- A caixa de busca avisa quando falta configurar uma chave ou quando os serviços estão fora do ar, em vez de mostrar só "Nenhum resultado".
- A versão exibida na barra lateral e nas Configurações agora é sempre a versão real do app (antes mostrava 1.2.0).

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
