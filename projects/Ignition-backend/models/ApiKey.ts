import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  key: string;
  modelId: string;
  hfModel: string;
  walletAddress: string;
  hits: number;
  totalTokens: number;
  accruedAlgo: number;
  isActive: boolean;
  createdAt: Date;
}

const ApiKeySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  modelId: { type: String, required: true },
  hfModel: { type: String, required: true },
  walletAddress: { type: String, required: true, index: true },
  hits: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  accruedAlgo: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
