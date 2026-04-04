import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateApiKey, hitApiKey, chatCompletion, getApiKeyStats } from './routes/apikeys';
import agentRoutes from './routes/agent.routes';
import dns from 'node:dns';
import { generateRoute } from './controllers/generate';
import baseModelsRouter from './routes/baseModels';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Main Proxy endpoint
app.post('/api/generate', generateRoute);

// Base model L402 endpoint
app.use('/api/base-models', baseModelsRouter);

// API Key management
app.post('/api/apikeys/generate', generateApiKey);
app.post('/api/apikeys/chat', chatCompletion);   // OpenAI-compatible chat endpoint
app.post('/api/apikeys/hit', hitApiKey);          // Legacy simple prompt endpoint
app.get('/api/apikeys/stats', getApiKeyStats);
app.use('/api', agentRoutes);

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ignition';
    try {
      await mongoose.connect(mongoUri);
      console.log(`[Init] Connected to MongoDB: ${mongoUri}`);
    } catch (error) {
      console.warn(`[Init] MongoDB unavailable at ${mongoUri}; continuing without DB-backed features.`);
    }

    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Init] Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
