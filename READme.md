<p align="center">
  <img src="https://img.shields.io/badge/STATUS-EM%20DESENVOLVIMENTO-red?style=for-the-badge" alt="Status"/>
  <img src="https://img.shields.io/badge/NODE.JS-v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node"/>
  <img src="https://img.shields.io/badge/SOCKET.IO-v4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket"/>
  <img src="https://img.shields.io/badge/AWS-EC2-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS"/>
  <img src="https://img.shields.io/badge/DOCKER-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

<h1 align="center">🛹 SKATE ROOM</h1>
<p align="center"><strong>Watch party em tempo real com estética skate underground</strong></p>
<p align="center">
  <a href="https://github.com/ognistie/Minha-Playlist">📂 Repositório</a> ·
  <a href="https://ognistie.github.io/portfolio/">🌐 Portfolio</a> ·
  <a href="https://github.com/ognistie">👤 @ognistie</a>
</p>

---

## 📺 O que é o SkateRoom?

**SkateRoom** é uma plataforma de **watch party em tempo real** onde amigos entram numa sala virtual, escolhem um personagem pixel art, sentam juntos num sofá e assistem vídeos de skate clássicos sincronizados — tudo rodando numa TV dentro de um cenário SVG interativo inspirado na cultura **skate e rap underground dos anos 90**.

O projeto foi construído do zero como um **estudo prático e aprofundado** de tecnologias web modernas, combinando frontend puro (HTML/CSS/JS), backend em tempo real (Node.js + Socket.io), APIs do YouTube, pixel art procedural, e deploy em cloud (AWS EC2).

### 🎯 O problema que resolve

Plataformas como Discord ou Twitch Watch Parties são ótimas, mas não têm **identidade visual** nem **personalização cultural**. O SkateRoom cria um espaço onde a estética importa tanto quanto a funcionalidade — como se fosse uma garagem de Compton nos anos 90, com graffiti na parede, DJ tocando no canto, uma skate shop do lado, e todo mundo reunido no sofá assistindo Daewon Song.

---

## 🏗️ Arquitetura do Projeto

```
skateroom/
├── index.html              # SPA — todas as páginas (Home, Sala, Skate, Bonde, Sobre, News)
├── css/
│   └── style.css           # Estilos globais — layout, componentes, responsivo
├── js/
│   ├── app.js              # Lógica principal — SPA router, YouTube sync, Socket.io client
│   ├── characters.js       # Template engine — 35 personagens gerados proceduralmente
│   └── playlist.js         # 22 vídeos de skate (IDs do YouTube)
├── server/
│   ├── index.js            # Backend — Express + Socket.io + Community API
│   ├── package.json        # Dependências Node.js
│   └── community.json      # Dados persistidos da comunidade (gerado automaticamente)
├── img/
│   ├── avatar.jpg          # Foto do desenvolvedor
│   └── banner.png          # Banner do projeto
├── Dockerfile              # Container para deploy
├── DEPLOY-AWS.md           # Guia completo de deploy na AWS EC2
└── README.md               # Este arquivo
```

---

## ⚙️ Stack Técnica — O papel de cada tecnologia

### 🌐 HTML5 + SVG Inline
**Função**: Estrutura de todas as páginas e cenários visuais

O HTML funciona como uma **Single Page Application (SPA)** — todas as 6 páginas (Home, Sala, Skate Builder, Bonde, Sobre, News) estão no mesmo `index.html` e são alternadas via JavaScript com `display:none/block`. Isso elimina carregamentos de página e mantém a experiência fluida.

Todo o cenário da sala de vídeo — parede de graffiti, sofá, TV, DJ stage, skate shop, personagens — é desenhado em **SVG puro inline**. Nenhuma imagem externa para o cenário. Isso permite:
- Escalar para qualquer resolução sem perder qualidade
- Manipular elementos via JavaScript (posicionar personagens, animar)
- Manter o projeto leve (sem assets pesados)

**Por que SVG?** Diferente de Canvas (rasterizado), SVG mantém cada elemento como um nó DOM que pode ser animado, clicado e estilizado com CSS.

### 🎨 CSS3 — Layout, Estética e Animações
**Função**: Visual 90s underground, responsividade, efeitos

- **CSS Grid** para o layout principal (sala + chat sidebar, mural, tech fair)
- **CSS Variables** para a paleta de cores consistente (`--blood-red`, `--amber`, `--purple`, `--dark-bg`)
- **Posicionamento absoluto percentual** para colocar o iframe do YouTube exatamente sobre a TV no SVG (`left:33%; top:11.5%; width:34%; height:46.2%`)
- **Animações**: neon pulsante, VHS scan line, ticker de notícias, hover effects nos cards
- **Backdrop-filter: blur()** nos overlays flutuantes
- **Drop-shadow filters** nos elementos SVG para profundidade
- **Media queries** para responsividade (mobile: sidebar vira horizontal)

### ⚡ JavaScript (ES6+) — Lógica e Interação
**Função**: SPA routing, YouTube API, Socket.io client, template engine de personagens

O `app.js` controla:
- **Navegação SPA**: `showPage()` alterna entre páginas sem recarregar
- **YouTube IFrame API**: carrega vídeos, controles customizados (play/pause/next/prev)
- **Socket.io client**: conecta ao servidor, emite eventos de sala
- **Sync de vídeo**: quando alguém dá play, todos sincronizam. Flag `isSyncing` (true por 2 segundos) previne loops infinitos onde um client emite play → server broadcast → outro client emite play → loop
- **Animação de caminhada**: quando um usuário entra na sala, seu personagem aparece na parte inferior e **caminha até o sofá** com animação frame-a-frame (pernas alternando) usando `requestAnimationFrame` e easing `easeInOutQuad`

O `characters.js` é um **template engine**:
- Cada personagem é definido como um objeto simples: `{skin, hat, hatColor, shirt, pants, shoes, shades, chain, ...}`
- Funções `CHAR_PARTS` geram SVG para cada parte do corpo (12 estilos de chapéu, cabeça, olhos, óculos, corrente, brincos, corpo, braços, calça, saia, sapatos)
- `buildCharSVG()` monta todas as peças em um SVG completo
- `charToWalkSVG()` gera frames de caminhada com pernas em ângulos alternados
- Resultado: **35 personagens** com apenas ~200 linhas de código (vs ~2000+ se fossem SVGs manuais)

### 📺 YouTube IFrame API
**Função**: Player de vídeo sincronizado dentro da TV

A API do YouTube permite:
- `loadVideoById()` — carregar qualquer vídeo por ID
- `seekTo()` — sincronizar posição quando alguém entra na sala
- `onStateChange` — detectar play/pause para emitir via Socket.io
- O iframe é posicionado via CSS absoluto sobre a tela da TV no SVG
- 22 vídeos de skate na playlist (Shorty's, Baker 3, Flip Sorry, Lakai Fully Flared, etc.)

### 🟢 Node.js + Express
**Função**: Servidor HTTP, API REST, servir arquivos estáticos

```javascript
const app = express();
app.use(express.static(path.join(__dirname, '../'))); // Serve frontend
app.use(express.json()); // Parse JSON bodies
```

- **Express** serve os arquivos estáticos (HTML, CSS, JS, imagens) na porta 3001
- **API REST** para a comunidade:
  - `GET /api/community` — lista posts
  - `POST /api/community/post` — cria post
  - `POST /api/community/post/:id/like` — toggle like
  - `POST /api/community/post/:id/comment` — adiciona comentário
- **Persistência**: dados salvos em `community.json` via `fs.writeFileSync()` — sobrevive a reinícios do servidor

### 🔄 Socket.io — Comunicação em Tempo Real
**Função**: Sincronização de vídeo, chat, presença de usuários

Eventos:
- `join-room` → usuário entra, recebe estado atual (vídeo, posição, lista de users)
- `video-state` → quando alguém dá play/pause, server forward para OUTROS users via `socket.to(roomCode)` (nunca de volta ao sender — isso previne o loop infinito)
- `chat-message` → broadcast para todos na sala
- `disconnect` → remove user, notifica sala
- `community-new-post` / `community-update-post` → broadcast para todos (mural em tempo real)

**Decisão arquitetural crítica**: usar `socket.to()` ao invés de `io.to()`. A diferença é que `socket.to()` envia para todos EXCETO o sender, eliminando o problema de echo que causava loop infinito de play/pause.

### ☁️ AWS EC2 + Nginx
**Função**: Hosting 24/7 acessível de qualquer lugar

- **EC2 Ubuntu 24.04** (t3.micro) — instância leve e barata
- **Node.js 20** instalado via NodeSource
- **PM2** — process manager que mantém o server rodando 24/7, reinicia automaticamente se crashar
- **Nginx** — reverse proxy que mapeia porta 80 (HTTP) para 3001 (Node), com suporte a WebSocket upgrade headers
- **Certbot** — SSL/HTTPS gratuito via Let's Encrypt
- **Elastic IP** — IP estático para não mudar quando a instância reiniciar
- **Security Groups**: portas 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (Node direto)

### 🐳 Docker
**Função**: Containerização para deploy consistente

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY . .
WORKDIR /app/server
CMD ["node", "index.js"]
```

O Dockerfile empacota tudo em um container leve (~150MB) que roda em qualquer ambiente com Docker, garantindo que funcione igual em dev e produção.

---

## 🤖 O Papel da Inteligência Artificial neste Projeto

### Claude — Parceiro de Desenvolvimento

Este projeto foi desenvolvido com auxílio da **Claude** (Anthropic), uma IA de linguagem avançada. É importante contextualizar o papel da IA e esclarecer como ela foi utilizada.

### O que veio antes da IA

Antes de começar qualquer linha de código com assistência da Claude, já existia uma **base sólida de conhecimento e planejamento**:

- **Conhecimento prévio em Cloud Computing e DevOps**: 12+ certificações em AWS, Azure, Docker, Terraform, Python, Linux. Experiência prática com infraestrutura, deploy, servidores e automação
- **Entendimento das tecnologias**: HTML, CSS, JavaScript, Node.js, Git, terminal Linux — já faziam parte do meu stack de conhecimento. Não foi "pedir para a IA fazer algo que eu não entendo"
- **Visão do produto**: a ideia do SkateRoom — uma watch party com estética 90s — foi concebida, pesquisada e planejada por mim. A referência visual (filme Mid 90s, cultura skate/rap de Compton, estética Habbo Hotel) é fruto de pesquisa e curadoria pessoal
- **Arquitetura pensada**: a decisão de usar SPA, Socket.io para real-time, SVG inline para cenários, YouTube API para vídeo, e EC2 para hosting foi uma escolha técnica consciente baseada em conhecimento de trade-offs

### Como a IA foi utilizada

A Claude atuou como um **par de programação avançado** — semelhante a trabalhar com um dev senior que:

- **Acelera a implementação**: transformar ideias em código funcional em minutos ao invés de horas
- **Sugere boas práticas**: padrões de código, estrutura de arquivos, prevenção de bugs (como o `isSyncing` flag para evitar loops)
- **Debugga em tempo real**: quando algo não funciona, a IA analisa o código e encontra o problema (como o conflito `window.postMessage` que causava falha silenciosa)
- **Produz código consistente**: mantém o estilo, naming conventions e arquitetura coesos ao longo de centenas de iterações

### IA como ferramenta — não como substituto

A IA é uma **ferramenta de produtividade**, assim como um IDE, um framework ou uma biblioteca. Usar Claude não é diferente de usar Stack Overflow, documentação oficial, ou tutoriais — é uma fonte de conhecimento que acelera o processo de desenvolvimento.

O diferencial está em **saber o que pedir, saber avaliar o output, e saber integrar ao projeto**. Um desenvolvedor que não entende a tecnologia não consegue:
- Descrever o que quer com precisão técnica
- Avaliar se o código gerado está correto
- Debuggar quando algo não funciona como esperado
- Tomar decisões arquiteturais sobre trade-offs

### O futuro da IA no desenvolvimento

Estamos numa era onde **a eficiência importa tanto quanto o conhecimento**. Profissionais que sabem utilizar IA como ferramenta de trabalho — mantendo o pensamento crítico e o conhecimento técnico como base — estão na frente do mercado. A IA não substitui o desenvolvedor; ela **potencializa** quem já tem a base.

No dia a dia, ferramentas como Claude podem:
- Ajudar estudantes a entender conceitos complexos com exemplos práticos
- Acelerar prototipagem de ideias para validação rápida
- Assistir em debugging e code review
- Gerar documentação e testes
- Traduzir requisitos de negócio em implementação técnica

O importante é que a IA seja uma **aliada no processo criativo**, não um atalho que pula o aprendizado.

---

## 🧑‍💻 Sobre o Desenvolvedor

<table>
<tr>
<td width="120"><img src="img/avatar.jpg" width="100" style="border-radius:50%"/></td>
<td>

**Guilherme Moraes Franco** · [@ognistie](https://github.com/ognistie)

Cloud Engineer · DevOps · Automação

🎓 Estudante de **Ciência da Computação**
💼 Estagiário de TI na **IT Universe**
📍 Gueto Pestana, SP

</td>
</tr>
</table>

### Certificações (12+)

| Certificação | Área |
|---|---|
| AZ-900 — Azure Fundamentals | ☁️ Cloud |
| AWS Cloud Practitioner | ☁️ Cloud |
| DevOps Essentials — 4Linux | ⚙️ DevOps |
| Linux Configuration — Senai | 🐧 Sistemas |
| Python 3 Avançado — Udemy | 🐍 Programação |
| IBM Cloud Fundamentals | ☁️ Cloud |
| GitHub Fundamentals | 🔄 Versionamento |
| Cloud Architect — FIAP | ☁️ Cloud |

### Skills

`AWS` `Azure` `Python` `Linux` `Docker` `Terraform` `CI/CD` `Node.js` `Socket.io` `JavaScript` `HTML/CSS` `SVG` `Help Desk`

### Links

- 🔗 **GitHub**: [github.com/ognistie](https://github.com/ognistie)
- 🌐 **Portfolio**: [ognistie.github.io/portfolio](https://ognistie.github.io/portfolio/)
- 📂 **Código do Projeto**: [github.com/ognistie/Minha-Playlist](https://github.com/ognistie/Minha-Playlist)

---

## 🚀 Como Rodar

### Local (desenvolvimento)

```bash
# 1. Clone o repositório
git clone https://github.com/ognistie/Minha-Playlist.git
cd Minha-Playlist

# 2. Instale as dependências do servidor
cd server
npm install

# 3. Inicie o servidor
node index.js

# 4. Acesse no browser
# http://localhost:3001
```

### AWS EC2 (produção)

Consulte o guia completo em [`DEPLOY-AWS.md`](DEPLOY-AWS.md)

```bash
# Resumo rápido:
# 1. EC2 Ubuntu 24.04 (t3.micro)
# 2. Instalar Node.js 20 + Nginx + PM2
# 3. Clone o repo
# 4. pm2 start server/index.js --name skateroom
# 5. Configurar Nginx reverse proxy
# 6. (Opcional) Certbot para HTTPS
```

### Docker

```bash
docker build -t skateroom .
docker run -d -p 3001:3001 --name skateroom skateroom
```

---

## 📱 Funcionalidades

| Página | Descrição |
|---|---|
| **Home** | Landing page com hero, features, seleção de personagem, entrada na sala |
| **Sala** | Cenário SVG com TV, sofá, DJ stage, skate shop. Vídeo do YouTube sincronizado em tempo real + chat |
| **Skate** | Customizador de skate estilo Skate 3 + insígnia/badge estilo Credly para compartilhar |
| **Bonde** | Mural interativo de recados da comunidade (persistido no servidor) |
| **Sobre** | Documentação técnica do projeto + portfolio do desenvolvedor |
| **News** | Tech Fair futurista com notícias de tecnologia de março 2026 |

---

## 📄 Licença

Este projeto é de código aberto para fins educacionais e de portfolio.

Desenvolvido com 🛹 por **Guilherme Moraes Franco** — [@ognistie](https://github.com/ognistie)

*"Reúna o bonde, entre na sala e assistam juntos — como nos anos 90."*
