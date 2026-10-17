# FESTA SEM NOME — site

Site de eventos da FSN (Festa sem Nome). Cada edição tem um **poster 3D generativo** próprio,
feito em shader — a arte não escreve o nome: o nome e a descrição misteriosa ficam na interface.

**Stack:** Node.js + Express (servidor) · three.js (3D) · HTML/CSS/JS puro no frontend (sem build).

---

## Itens do projeto

```
festa-sem-nome/
├── server.js              ← arquivo principal do servidor
├── package.json
├── install.bat            ← instala tudo (Windows)
├── run.bat                ← roda a aplicação (Windows, Wi-Fi + Tailscale)
├── compartilhar.bat       ← libera a porta 3018 no firewall (pede admin)
├── Dockerfile             ← imagem de produção
├── docker-compose.yml     ← rodar local com Docker
├── render.yaml            ← deploy no Render (blueprint)
├── Procfile               ← deploy Railway/Heroku
├── README.md
├── .gitignore
├── data/                  ← criado sozinho: lista de convidados (fora do git)
│   └── lista.json
├── node_modules/          ← após o install
└── public/                ← TODO o frontend
    ├── index.html
    ├── 404.html
    ├── assets/
    │   └── favicon.svg
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js         ← interface, lista de edições, formulário
        └── scenes.js      ← os três posters 3D (three.js + GLSL)
```

---

## Como rodar

**Windows (duplo clique):**

1. `install.bat` — instala as dependências (express, three)
2. `run.bat` — sobe o servidor e abre o browser

**Terminal:**

```bash
npm install
npm start
# http://127.0.0.1:3018
```

> El puerto por defecto es **3018** (en este equipo Docker Desktop ya ocupa el 3000).

Outra porta:

```bash
set PORT=4000 && node server.js        # Windows cmd
PORT=4000 node server.js               # bash
```

---

## Edições (posters 3D)

| # | Evento | Data | Arte | Paleta |
|---|---|---|---|---|
| 01 | **RAWMORPHIC** | 18 nov 2026 | three.js: massa metálica em morph contínuo (noise 4 octavas) | violeta / azul |
| 02 | **ANALOGIC SAMB** | 18 dez 2026 | ComfyUI (Z-Image) + mapa de profundidade → parallax 2.5D | âmbar / óxido |
| 03 | **PRO VYNIL TECHNO** | 31 dez 2026 (New Year) | ComfyUI (Z-Image) + mapa de profundidade → parallax 2.5D | lavanda / violeta |

### Pipeline dos pôsteres com profundidade

```
tools/gen_poster.py <slug> "<prompt>" [w] [h] [seed]   → ComfyUI (local, :8188)
      ↓  PNG em public/assets/posters/<slug>.png  +  metadados em data/posters/<slug>.json
tools/depth_map.py <slug>                              → <slug>-depth.png (parallax)  +  <slug>-normal.png (relevo)
      ↓
public/js/scenes.js → buildImagePoster()               → shader: parallax por vértice + grão + scanlines + deriva
```

O mapa de profundidade é **derivado localmente** (luminância + desfoque guiado + viés
radial), porque não há nós de estimativa de profundidade instalados no ComfyUI —
é uma aproximação honesta, não um depth real de ControlNet.

Referência de estilo e metadados do artista: `data/references-neosdl.json`
(extraído de `https://neosdl-work.com/gallery` com `tools/extract_refs.py`).

Cada poster é só uma imagem: **sem nome dentro da arte**. O nome, a data e a
descrição misteriosa aparecem na interface, ao lado/abaixo.

Arraste o poster com o mouse (ou o dedo) para orbitar a câmera.

---

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/health` | status do servidor + se o three.js está presente |
| GET | `/api/site` | dados da marca (nome, Instagram, contato) |
| GET | `/api/events` | todas as edições |
| GET | `/api/events/:id` | uma edição (`rawmorphic`, `analogic-samb`, `pro-vynil-techno`) |
| POST | `/api/lista` | entra na lista: `{ nome, telefone, quemTrouxe, evento }` |
| GET | `/api/lista/count` | total de pessoas na lista |

Exemplo:

```bash
curl -X POST http://127.0.0.1:3000/api/lista \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","telefone":"11999990000","quemTrouxe":"Felippe","evento":"rawmorphic"}'
```

---

## Para editar

- **Textos, datas, lineups, links** → `server.js`, array `EVENTS` (uma entrada por edição).
- **Visual/estilo** → `public/css/style.css` (variáveis no `:root`).
- **Cores/arte 3D** → `public/js/scenes.js` (uma função `build*` por cena).

### Adicionar uma edição nova

1. Copie um objeto do array `EVENTS` em `server.js`.
2. Troque `id`, `title`, `isoDate`, `tagline`, `description` e `scene`.
3. Se quiser uma arte nova, crie `buildNome()` em `scenes.js` e registre no `setScene()`.

---

## Compartilhar (Wi-Fi e Tailscale)

O servidor escuta em `0.0.0.0:3018`, então responde em todas as interfaces.
Falta só **liberar a porta no firewall do Windows** — uma vez:

```
compartilhar.bat      ← duplo clique, aceite o cartel do UAC
```

ou, num PowerShell **como Administrador**:

```
netsh advfirewall firewall add rule name="FestaSemNome 3018" dir=in action=allow protocol=TCP localport=3018
```

Depois, os links para os outros aparelhos:

| Rede | Link | Quem entra |
|---|---|---|
| Wi-Fi | `http://192.168.1.12:3018` | qualquer um na mesma rede (IP é DHCP: pode mudar) |
| Tailscale | `http://100.68.202.114:3018` | só os dispositivos da sua tailnet (`tachyonic.zak@gmail.com`): esta PC, PC-KAZ-MANCUZO, S26 Ultra |

Só nesta máquina: `HOST=127.0.0.1 node server.js`.

## Deploy (link público, sem depender de rede)

O repo já tem tudo. Três caminhos:

**Render (o mais simples)** — render.com → *New* → **Blueprint** → escolha
`Zakd-D/festa-sem-nome` → *Apply*. O `render.yaml` cria o serviço em Docker,
no plano free, com health check em `/api/health`.

**Railway / Fly** — leem o `Dockerfile`; o `Procfile` cobre Railway/Heroku.

**Docker em qualquer VPS**
```
docker compose up --build -d      # http://localhost:3018
```

### Aviso importante sobre a lista de convidados

`data/lista.json` é um arquivo local. Em host efêmero (Render free, Railway
free) ele **some a cada deploy/reinício**. Para guardar de verdade:
- disco persistente montado em `/app/data` (plano pago), ou
- trocar o armazenamento por um banco/planilha (Google Sheets, Airtable, Supabase).

## Conteúdo

Os textos vêm de dois documentos do projeto (pasta `Festa sin nome`, no Desktop):

- `INTERNO - Festa Sem Nome - 18-11.md` — plano interno (não publicar)
- `WEB - Festa Sem Nome - 18-11.md` — conteúdo público do site

**Nada de orçamento, cachê, split de lucro ou fornecedores vai para o site.**

---

## Deploy

Serve em qualquer host com Node (Railway, Render, Fly, VPS). O frontend é estático;
o único estado no servidor é `data/lista.json`.

```bash
node server.js   # respeita process.env.PORT
```

Para produção com HTTPS, coloque atrás de um proxy (Caddy, Nginx, Cloudflare).
