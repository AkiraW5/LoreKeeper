# 📖 LoreKeeper

Aplicativo desktop pessoal para rastrear mídias consumidas — jogos, filmes, séries, animes, mangás, livros e mais.

![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-%20%20GNU%20GPLv3%20-blue)

[![Release](https://img.shields.io/github/v/release/AkiraW5/LoreKeeper?label=vers%C3%A3o)](../../releases/latest) · [Changelog](CHANGELOG.md)

---

## Instalação (Windows)

Você **não precisa** instalar Node.js, Electron ou qualquer dependência de desenvolvimento.

### Opção 1 — Instalador (.exe)

1. Vá até a aba [**Releases**](../../releases) deste repositório
2. Baixe o arquivo `LoreKeeper-Setup-X.X.X.exe`
3. Execute o instalador e siga as instruções
4. O app será instalado e criará um atalho no menu iniciar

O instalador **se atualiza sozinho**: quando sai uma versão nova, o app mostra um aviso perguntando se você quer atualizar. Nada é baixado sem você aceitar.

### Opção 2 — Portable (sem instalação)

1. Vá até a aba [**Releases**](../../releases) deste repositório
2. Baixe o arquivo `LoreKeeper-X.X.X.exe` (versão portable)
3. Coloque em qualquer pasta e execute — pronto!

A versão portable **não** se atualiza sozinha: baixe a nova versão nos Releases quando quiser atualizar.

> **Nota:** Na primeira execução, o Windows SmartScreen pode exibir um aviso (app não assinado digitalmente). Clique em "Mais informações" → "Executar assim mesmo".

---

## Stack

- **Electron 44** — Aplicativo desktop multiplataforma
- **React 19** + **TypeScript 6** — UI reativa e tipada
- **Vite 8** — Build rápido com HMR
- **Tailwind CSS 3** — Estilização utilitária com tema escuro
- **sql.js** — SQLite compilado em WebAssembly (sem dependências nativas)
- **Recharts 3** — Gráficos e estatísticas interativas
- **Lucide React** — Ícones modernos
- **electron-updater** — Atualização automática via GitHub Releases

## Funcionalidades

### 🎮 Jogos

- **Jogos Zerados** — Lista completa com nome, console, gênero, tipo, data, tempo, nota (1-11), dificuldade (C/B/A/AA/AAA), condição de zeramento, gold/platina e marcador de missão completa
- **Backlog** — Jogos planejados com estimativa de horas, vontade de jogar (1-5), se possui o jogo, se está jogando
- **Séries de Jogos** — Tracking por franquia com busca via API, capa por entrada, edição de nome e vínculo com jogos zerados
- **Roleta** — Não sabe o que jogar? A roleta escolhe por você com filtros personalizados

### 🎬 Mídia

- **Filmes** — Título, gênero, diretor, ano, data, duração, nota
- **Séries de TV** — Temporadas, episódios, status (Assistindo/Concluído/Dropado/Pausado/Planejado)
- **Animes** — Tipo (TV/Filme/OVA/ONA), episódios, estúdio, status
- **Mangás/Manhwas** — Capítulos, volumes, tipo (Mangá/Manhwa/Manhua/Webtoon)
- **Livros/Light Novels** — Páginas, tipo (Livro/LN/VN/HQ/Comic)

### 📊 Dashboard

- Contadores automáticos por categoria
- Tempo total jogado
- Gráficos de jogos por ano, nota, dificuldade
- Stats por plataforma e gênero

### 📈 Acompanhamento & Insights

- **Em Andamento** — Tudo que você está consumindo agora num só lugar (jogos jogando, séries/animes assistindo, mangás/livros lendo) com card de destaque, barras de progresso e botão +N que conclui automaticamente ao chegar no fim
- **Mapa de Atividade** — Heatmap estilo GitHub com suas conclusões ao longo do ano, dias ativos, melhor sequência e dia favorito
- **Estatísticas** — KPIs e gráficos interativos: conclusões e horas por ano, distribuição de notas, top gêneros/plataformas, dificuldade e comparativo entre mídias
- **Radar de Hábitos** — Leituras do seu histórico: perfil de jogador, sugestões personalizadas ("faz X meses que você não joga tal plataforma — que tal voltar?") e curiosidades (jogo mais longo, melhor ano, jogos da vida)
- **Desafio Anual** — Quadro de metas automáticas por categoria, sugeridas pelo seu ritmo do ano anterior, com 4 tipos (volume, tempo, variedade, qualidade) e projeção de conclusão

### 🎯 Missões & Conquistas

- **Missões** — Crie objetivos personalizados com prazo, progresso e capa/foto
- **Conquistas** — Sistema de XP e nível, com barra de progresso rumo às conquistas bloqueadas e painel "Próximas a desbloquear"
- **Integração com Jogos Zerados** — Vincule jogos a missões e atualize progresso automaticamente

### 🔍 Busca de Metadados via API

- **RAWG.io** — Busca automática de capas, descrições e dados de jogos
- **TMDB** — Busca de capas e sinopses para filmes, séries e animes
- **Open Library** — Fonte principal para livros
- **Google Books** — Fallback para busca de livros (sem chave necessária)
- Ao adicionar qualquer mídia, clique em "Buscar" para preencher automaticamente

### ⚙️ Configurações

- Escolha onde salvar o banco de dados (Google Drive, OneDrive, Dropbox)
- Configure as chaves de API gratuitamente

## Novidades da 1.2.2

- **Aviso de atualização dentro do app** — quando sai uma versão nova, aparece um aviso discreto perguntando se você quer atualizar, com barra de progresso e link para as novidades
- Releases com descrição detalhada

O histórico completo de versões está no [CHANGELOG](CHANGELOG.md).

## Desenvolvimento

Para contribuir ou rodar localmente:

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run electron:dev

# Build para produção
npm run electron:build
```

### Lançando uma versão

1. Adicione a seção `## [X.Y.Z]` no [CHANGELOG.md](CHANGELOG.md) — ela vira a descrição do release (o workflow falha se ela não existir)
2. Rode `npm version patch` (ou `minor` / `major`) e depois `git push --follow-tags`
3. O GitHub Actions gera o instalador e o portable, publica o release e os apps instalados recebem o aviso de atualização

## Configuração de APIs (opcional)

Para buscar capas e metadados automaticamente:

1. **RAWG.io** (jogos) — Crie uma conta gratuita em [rawg.io/apidocs](https://rawg.io/apidocs) e copie a API key
2. **TMDB** (filmes/séries/animes) — Crie uma conta em [themoviedb.org](https://www.themoviedb.org/) → Settings → API
3. **Google Books** (livros) — Funciona sem chave!

Cole as chaves na página de **Configurações** do app.

## Estrutura

```
├── electron/              # Main process do Electron
│   ├── main.ts           # Janela principal + IPC handlers + auto-update
│   ├── preload.ts        # Context bridge para o renderer
│   ├── database.ts       # Schema SQLite + inicialização + migrações
│   └── api-services.ts   # Serviços de busca (RAWG, TMDB, Google Books)
├── src/                   # Renderer (React)
│   ├── components/       # Componentes reutilizáveis (Modal, SearchBar, ApiSearchBox...)
│   ├── pages/            # Páginas de cada seção
│   ├── lib/              # Utilitários
│   ├── types.ts          # Tipos + constantes
│   ├── App.tsx           # Layout principal com rotas
│   └── main.tsx          # Entry point
├── .github/workflows/    # CI: typecheck/build em PRs, release em tags v*
├── build/                # Recursos de build (ícones)
├── public/               # Assets estáticos
└── CHANGELOG.md          # Notas de cada versão (viram a descrição do release)
```

## Notas

- Interface em **português do Brasil**
- Tema **escuro** como padrão
- Datas no formato **dd/mm/yyyy**
- Tempo no formato **HH:MM:SS**
- Dados salvos localmente via SQLite (WebAssembly)
- Sincronização com a nuvem via pasta customizada

## Licença

[Licensed](LICENSE) under GPLv3. Commercial sale of this compiled software by third parties is discouraged and against the spirit of the project.

---

<div align="center">
  <p>⭐ Se este projeto foi útil para você, considere dar uma estrela! ⭐</p>
  <p>Desenvolvido com ❤️ e ☕</p>
</div>
