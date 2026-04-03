# Pay Trace AI

A monorepo project with Node.js + TypeScript backend and React + TypeScript frontend.

AI-powered payment error debugger — paste a PSP error, get an instant diagnosis using RAG and agent tool use

## Project Structure

```
pay-trace-ai/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── routes/   # API routes
│   │   ├── agent/    # AI agent logic
│   │   ├── rag/      # RAG implementation
│   │   └── tools/    # Utility tools
│   └── scripts/      # Build and deployment scripts
└── frontend/         # React + Vite application
    └── src/
        ├── components/  # React components
        ├── hooks/       # Custom React hooks
        └── types/       # TypeScript type definitions
```

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- tsx (for development)
- dotenv
- cors
- zod

### Frontend
- React + TypeScript
- Vite
- ESLint

## Development

- Backend runs on port 3000 by default
- Frontend runs on port 5173 by default (Vite)
- Backend dev server uses `tsx watch` for hot reload
