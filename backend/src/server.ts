import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { healthCheck, analyzeError, mcpAuth, mcpLookup, mcpProviderCodes, mcpSearch, mcpProviders } from './controllers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware
app.use(cors());
app.use(express.json());

// HTTP request logging
// 'dev' format in development: colorized, concise output
// 'combined' format in production: Apache-style logs for parsing/analysis
app.use(morgan(isDevelopment ? 'dev' : 'combined'));

// Routes
app.get('/health', healthCheck);
app.post('/analyze', analyzeError);

// MCP routes — protected by X-MCP-Key header
app.get('/mcp/lookup', mcpAuth, mcpLookup);
app.get('/mcp/provider-codes', mcpAuth, mcpProviderCodes);
app.post('/mcp/search', mcpAuth, mcpSearch);
app.get('/mcp/providers', mcpAuth, mcpProviders);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Mock AI Mode: ${process.env.USE_MOCK_AI === 'true' ? 'ENABLED' : 'DISABLED'}`);
});
