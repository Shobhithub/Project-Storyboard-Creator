# Vizzy Studio

AI-assisted studio for creating graphic novels, illustrated stories, and film storyboards. Creators work with Vizzy to plan scenes, define a reusable visual style and character library, generate image alternatives, select and refine non-destructive versions, approve pages, and play the approved sequence as a looping slideshow.

> **Credentials are intentionally not included.** This repository cannot create MongoDB Atlas, OpenAI, or Cloudinary accounts or issue their private credentials. Add your own secrets to an ignored `.env` file; never commit them. No live provider call is claimed until credentials and services are configured.

## Current implementation

- **Client:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Zustand, Lucide.
- **API:** Express 5 + TypeScript, Zod validation, Helmet, origin-restricted credentialed CORS, request rate limits, centralized safe errors.
- **Data:** MongoDB/Mongoose models for users, projects, pages, characters, chat messages, image assets, and durable generation jobs. Image bytes are stored in object storage—not in MongoDB.
- **Authentication:** bcrypt password hashes, signed JWT in an HTTP-only cookie, owner checks on project/page/asset routes.
- **AI:** provider interfaces for OpenAI text/image APIs and a self-hosted ComfyUI image workflow. There is no silent fake-success fallback in the authenticated API.
- **Storage:** private-by-application authenticated media route backed by local disk in development or Cloudinary in production.
- **Generation:** queued jobs return immediately, can be polled, record alternatives and metadata, preserve previous image versions, recover queued work after restart, and support idempotency/retries.
- **Browser demo:** `npm run dev:demo` and the GitHub Pages build use explicitly labelled localStorage/SVG demo behavior. It does **not** provide accounts, server persistence, or real AI. The Pages URL is not a substitute for the full-stack deployment.

## Requirements

- Node.js 22 LTS (Node 20.19+ is required by the current Mongoose release)
- MongoDB 7+ (local or Atlas; a replica set is recommended for transactions)
- An OpenAI API key for Vizzy story planning/chat and OpenAI image generation, **or** a running ComfyUI server with an API-format workflow for open-source image generation
- Optional Cloudinary credentials for production image storage

## Local setup

### macOS / Linux

```bash
npm ci
cp .env.example .env
# Edit .env: configure MongoDB and generate a private JWT_SECRET.
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The Express API listens on port `3001`.

### Windows PowerShell

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env in your editor. Set a MongoDB connection string and generate a new secret:
$bytes = [byte[]](1..48 | ForEach-Object { Get-Random -Maximum 256 })
$secret = [Convert]::ToBase64String($bytes)
# Paste $secret as JWT_SECRET in .env. Do not use the sample placeholder.
npm run dev
```

For a browser-only demonstration without MongoDB or AI credentials:

```powershell
npm run dev:demo
```

This mode saves projects in the current browser's local storage; it is useful for previewing the UI only. It is deliberately marked as a demo and must not be used for production data.

### MongoDB notes

Set `MONGODB_URI` in `.env`. For a local MongoDB service, the sample URI is `mongodb://127.0.0.1:27017/vizzy-studio`. For Atlas, use the connection string supplied by your own Atlas project and keep its password out of source control. The API fails fast if MongoDB or the JWT secret is not configured; it does not pretend a database is connected.

## AI providers and pricing

### OpenAI

Set `OPENAI_API_KEY` on the **server only**. Suggested settings in `.env.example`:

```dotenv
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst
OPENAI_BASE_URL=https://api.openai.com/v1
IMAGE_PROVIDER=openai
```

The image integration uses the Images API's generation and image-edit operations. Refinement supplies the selected prior image as an edit reference and creates a new `ImageAsset` version; it never overwrites the prior version. Character reference images (up to four) are sent as visual references when the provider supports them. This improves continuity but cannot guarantee identical faces or details between generations.

**Check current model availability, features, and prices before enabling generation**, since models and prices change. Official references:

- [Image generation and editing guide](https://platform.openai.com/docs/guides/image-generation)
- [Image model catalog](https://platform.openai.com/docs/models)
- [API pricing](https://platform.openai.com/docs/pricing/)

Image generation is metered and can incur material costs—especially when generating multiple alternatives. The application limits alternatives to 1–4 per request and enforces a per-user daily cap; set your own budget and review provider billing. Configure a currently supported image model in `OPENAI_IMAGE_MODEL` if the default model is unavailable to your account.

### Free/open-source image generation with ComfyUI

ComfyUI is open-source software, but the model weights, hardware, and energy required to run it are not automatically free. Install and run your own ComfyUI instance, download a compatible model under its license, and export an **API-format workflow JSON** that includes a text-encoder input containing the exact placeholder `{{PROMPT}}`. Configure:

```dotenv
IMAGE_PROVIDER=comfyui
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_FILE=docs/comfyui-workflow.example.json
```

The sample workflow uses a local checkpoint file and must be updated to match the checkpoint installed in your ComfyUI instance. Generation is submitted to `/prompt`, polled through `/history`, and the finished file is downloaded from `/view`. For image-to-image editing, the workflow must also accept an image input containing `{{IMAGE}}`; the API will return a clear error if the required edit input is missing. Vizzy never reports a successful render when ComfyUI fails.

Text-based story planning and conversation use OpenAI in this release. ComfyUI is an image-provider alternative, not a free text-AI service.

## Image storage

Development default:

```dotenv
IMAGE_STORAGE_PROVIDER=local
```

Local files are written under `server/uploads/`, ignored by Git, and served through an authenticated media endpoint. For a hosted environment, use Cloudinary and set:

```dotenv
IMAGE_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Only configure credentials for the provider you actually use. Cloudinary URLs are returned to an authenticated application route; API secrets remain server-side. Use a persistent disk or Cloudinary for production—ephemeral Render filesystems are not durable.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run MongoDB-backed Express API and Vite client concurrently; requires `.env` and MongoDB. |
| `npm run dev:demo` | Run the explicitly localStorage-backed browser demo (no API server). |
| `npm run build` | Type-check TypeScript and build the production client. |
| `npm start` | Start the MongoDB-backed API and serve the production build. |
| `npm run typecheck` | Type-check client and server. |
| `npm test` | Run Vitest unit/API tests. |
| `npm run lint` | Run ESLint. |

## Workflow

1. Register, sign in, create a project, and save a story brief and style guide.
2. Add reusable characters and optional reference images.
3. Ask Vizzy to create a structured scene outline. Review it, then approve it to add draft pages.
4. Generate 1–4 alternatives for a page. The API responds with a persistent job ID; the client polls until it completes or reports an actionable failure.
5. Select an image to put the page into **review**—selection does not approve it. Refine it in natural language to create another version, or edit dialogue and narration.
6. Approve each final page. Only approved pages appear in the slideshow, in saved order. The player supports autoplay, pause, looping, per-page duration, previous/next controls, keyboard shortcuts, and next-image preloading.

Useful keyboard controls in the slideshow: **← / →** previous/next, **Space** pause/resume, **Esc** exit.

## API outline

All project and asset routes require a valid session cookie and enforce project ownership.

- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/story-plan`, `POST /api/projects/:projectId/story-plan/approve`, `POST /api/projects/:projectId/chat`, `PATCH /api/projects/:projectId/style-guide`
- `GET/POST /api/projects/:projectId/pages`, `GET/PATCH/DELETE /api/pages/:pageId`, `PATCH /api/projects/:projectId/page-order`, `POST /api/pages/:pageId/approve`
- `POST /api/pages/:pageId/generations`, `POST /api/pages/:pageId/refine`, `GET /api/generations/:generationId`, `POST /api/generations/:generationId/retry`, `GET /api/pages/:pageId/assets`, `POST /api/pages/:pageId/select-asset`
- `GET/POST /api/projects/:projectId/characters`, `PATCH/DELETE /api/characters/:characterId`, character-reference upload route under `/api/projects/:projectId/characters/:characterId/references`
- `GET /api/projects/:projectId/slideshow`

Generation POST requests accept an `Idempotency-Key` header and respond `202 Accepted` with a job ID. Poll the job route until `completed` or `failed`. A failed job can be retried with its retry endpoint; provider errors do not create dummy assets.

## Production deployment

For a full-stack deployment, deploy the Node server to Render (or a comparable persistent Node host) and the Vite client to Vercel. Configure MongoDB Atlas, a persistent image storage provider, a long random `JWT_SECRET`, and the server-side API credentials. Set `CLIENT_URL` to the exact deployed frontend origin, configure the Vercel `/api` proxy to the Render service, and set secure HTTPS cookies. Never put `OPENAI_API_KEY`, MongoDB credentials, JWT secrets, or Cloudinary secrets in `VITE_*` variables.

`npm run build` builds the client. `npm start` runs the Express API and serves `dist` when colocated. GitHub Pages is configured only for a browser demo; it cannot host this MongoDB/Express backend or securely run provider keys. Its one-time Pages setting must use **GitHub Actions**. The expected Pages address is `https://shobhithub.github.io/Project-Storyboard-Creator/`, but it is not a full-stack production URL.

## Tests and current limits

Vitest covers validation/provider prompt construction and API behavior without requiring real MongoDB or paid AI calls. Full acceptance testing still requires a configured MongoDB instance, a valid provider key or ComfyUI endpoint, and a storage provider. This repo does not include generated credentials, third-party service accounts, or a provisioned production database. Character continuity is best-effort; image models do not guarantee exact likeness. MP4 export is not included.
