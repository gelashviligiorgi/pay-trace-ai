import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthCheck, analyzeError } from './controllers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', healthCheck);
app.post('/analyze', analyzeError);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Mock AI Mode: ${process.env.USE_MOCK_AI === 'true' ? 'ENABLED' : 'DISABLED'}`);
});
