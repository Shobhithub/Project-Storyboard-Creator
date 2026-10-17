# Vizzy Studio

A working MVP for making illustrated stories, graphic novels, and storyboards collaboratively with Vizzy. It includes a responsive chat-and-canvas workspace, persistent SQLite projects and frames, two-choice image generation, frame refinement through chat, slideshow playback, and a self-contained HTML slideshow export.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The demo workspace seeds itself on first run. Projects and generated frames persist in `server/vizzy.sqlite`.

## Connect live AI

The app calls the OpenAI-compatible Chat Completions and Images APIs from the backend (the API key is never sent to the browser). Copy `.env.example` to `.env` and add your key:

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`. Optional settings (with defaults shown) are `OPENAI_CHAT_MODEL=gpt-4o-mini`, `OPENAI_IMAGE_MODEL=gpt-image-1`, and `OPENAI_BASE_URL=https://api.openai.com/v1`.

When no key is set, the app remains fully usable in Studio mode with locally generated, self-contained SVG storyboard artwork. Add a project, talk with Vizzy, generate two visual directions, select one to add it to the sequence, and use **Play story** or **Export story** to view/share the result.

## Production

```bash
npm run build
npm start
```

The Express server serves the built frontend and API together. `PORT` defaults to `3001`.
