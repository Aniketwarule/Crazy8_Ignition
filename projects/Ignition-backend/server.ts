import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateApiKey, hitApiKey, getApiKeyStats } from './routes/apikeys';
import agentRoutes from './routes/agent.routes'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.post('/api/apikeys/generate', generateApiKey);
app.post('/api/apikeys/hit', hitApiKey);
app.get('/api/apikeys/stats', getApiKeyStats);
app.use('/api', agentRoutes);

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ignition';
    await mongoose.connect(mongoUri).then(() => console.log('Connected to db')).catch((error) => console.log(error));

    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Init] Server startup failed:', error);
    process.exit(1);
  }
};

startServer();