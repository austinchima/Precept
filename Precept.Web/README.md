# Precept — Web

The React frontend for Precept, the career command center for software engineers.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- React Router 7

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000) and proxies `/api`
to the backend (`API_TARGET`, default `http://localhost:5177`). Start the API
(`Precept.Api`) alongside it.

## Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/`          |
| `npm run preview` | Preview the production build       |
| `npm run lint`  | Type-check with `tsc --noEmit`       |
