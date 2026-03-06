# 📖 LoreKeeper

Aplicativo desktop pessoal para rastrear mídias consumidas — jogos, filmes, séries, animes, mangás, livros e mais.

![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Non--Commercial-blue)

Versão atual: **1.1.0**

---

## Instalação (Windows)

Você **não precisa** instalar Node.js, Electron ou qualquer dependência de desenvolvimento.

### Opção 1 — Instalador (.exe)

1. Vá até a aba [**Releases**](../../releases) deste repositório
2. Baixe o arquivo `LoreKeeper-Setup-X.X.X.exe`
3. Execute o instalador e siga as instruções
4. O app será instalado e criará um atalho no menu iniciar

### Opção 2 — Portable (sem instalação)

1. Vá até a aba [**Releases**](../../releases) deste repositório
2. Baixe o arquivo `LoreKeeper-X.X.X.exe` (versão portable)
3. Coloque em qualquer pasta e execute — pronto!

> **Nota:** Na primeira execução, o Windows SmartScreen pode exibir um aviso (app não assinado digitalmente). Clique em "Mais informações" → "Executar assim mesmo".

---

## Stack

- **Electron 33** — Aplicativo desktop multiplataforma
- **React 18** + **TypeScript** — UI reativa e tipada
- **Vite 6** — Build rápido com HMR
- **Tailwind CSS 3** — Estilização utilitária com tema escuro
- **sql.js** — SQLite compilado em WebAssembly (sem dependências nativas)
- **Recharts** — Gráficos e estatísticas interativas
- **Lucide React** — Ícones modernos

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

### 🎯 Missões & Conquistas

- **Missões** — Crie objetivos personalizados com prazo, progresso e capa/foto
- **Conquistas** — Sistema de XP e nível baseado nas suas atividades
- **Integração com Jogos Zerados** — Vincule jogos a missões e atualize progresso automaticamente

## Novidades da 1.1.0

- Open Library adicionado como fonte principal para metadados de livros (com fallback para Google Books)
- Melhorias em Séries de Jogos:
  - Auto-vínculo mais preciso com jogos zerados
  - Busca por API ao adicionar e editar entradas
  - Persistência de capa por entrada da série
  - Correção do bug visual de `0` no checkbox
- Melhorias em Jogos Zerados:
  - Fluxo de `Missão Completa` corrigido
  - Indicador visual (`🎯`) para jogos marcados como missão completa
  - Recontagem de progresso da missão em criação, edição e exclusão
- Melhorias em Missões:
  - Upload/seleção de imagem para missão
  - Criação e listagem com visual de capa

### 🔍 Busca de Metadados via API

- **RAWG.io** — Busca automática de capas, descrições e dados de jogos
- **TMDB** — Busca de capas e sinopses para filmes, séries e animes
- **Open Library** — Fonte principal para livros
- **Google Books** — Fallback para busca de livros (sem chave necessária)
- Ao adicionar qualquer mídia, clique em "Buscar" para preencher automaticamente

### ⚙️ Configurações

- Escolha onde salvar o banco de dados (Google Drive, OneDrive, Dropbox)
- Configure as chaves de API gratuitamente

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

## Configuração de APIs (opcional)

Para buscar capas e metadados automaticamente:

1. **RAWG.io** (jogos) — Crie uma conta gratuita em [rawg.io/apidocs](https://rawg.io/apidocs) e copie a API key
2. **TMDB** (filmes/séries/animes) — Crie uma conta em [themoviedb.org](https://www.themoviedb.org/) → Settings → API
3. **Google Books** (livros) — Funciona sem chave!

Cole as chaves na página de **Configurações** do app.

## Estrutura

```
├── electron/              # Main process do Electron
│   ├── main.ts           # Janela principal + IPC handlers
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
├── build/                # Recursos de build (ícones)
└── public/               # Assets estáticos
```

## Notas

- Interface em **português do Brasil**
- Tema **escuro** como padrão
- Datas no formato **dd/mm/yyyy**
- Tempo no formato **HH:MM:SS**
- Dados salvos localmente via SQLite (WebAssembly)
- Sincronização com a nuvem via pasta customizada

## Licença

[Non-Commercial License](LICENSE) — Use, modifique e distribua livremente. Forks são bem-vindos! Apenas uso comercial (venda) é proibido.
