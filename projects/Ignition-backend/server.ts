import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateRoute } from './routes/generate';
import { generateApiKey, hitApiKey, getApiKeyStats } from './routes/apikeys';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Main Proxy endpoint
app.post('/api/generate', generateRoute);

// API Key management
app.post('/api/apikeys/generate', generateApiKey);
app.post('/api/apikeys/hit', hitApiKey);
app.get('/api/apikeys/stats', getApiKeyStats);

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ignition';
    console.log(`[Init] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('[Init] MongoDB Connected Successfully.');

    app.listen(PORT, () => {
      console.log(`[Init] Ignition Gateway running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Init] Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
