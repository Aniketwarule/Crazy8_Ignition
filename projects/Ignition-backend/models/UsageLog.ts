import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageLog extends Document {
  apiKey: string;
  modelId: string;
  hfModel: string;
  walletAddress: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptSnippet: string;
  responseSnippet: string;
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: Date;
}

const UsageLogSchema: Schema = new Schema({
  apiKey: { type: String, required: true, index: true },
  modelId: { type: String, required: true },
  hfModel: { type: String, required: true },
  walletAddress: { type: String, required: true, index: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  promptSnippet: { type: String, default: '' },
  responseSnippet: { type: String, default: '' },
  latencyMs: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'error'], default: 'success' },
  errorMessage: { type: String },
}, { timestamps: true });

export default mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
