import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  agentId: string;
  name: string;
  description: string;
  priceAlgo: number;
  creatorWallet: string;
  hostingType: 'internal' | 'external';
  baseModel?: string;
  systemPrompt?: string;
  endpointUrl?: string;
  APIkey?: string;
}

const AgentSchema: Schema = new Schema({
  agentId: { type: String, unique: true },
  name: { type: String, required: true, index: true },
  description: { type: String, required: true },
  priceAlgo: { type: Number, required: true },
  creatorWallet: { type: String, required: true, index: true },
  hostingType: { type: String, enum: ['internal', 'external'], required: true },
  baseModel: {
    type: String,
    required: function(this: any) { return this.hostingType === 'internal'; }
  },
  systemPrompt: {
    type: String,
    required: function(this: any) { return this.hostingType === 'internal'; }
  },
  endpointUrl: {
    type: String,
    validate: {
        validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: "Invalid URL"
    },
    required: function(this: any) { return this.hostingType === 'external'; }
  },
  APIkey: {
    type: String,
    required: function(this: any) { return this.hostingType === 'internal'; }
  }
}, { timestamps: true });

AgentSchema.pre('save', function(this: any, next: any) {
  if (!this.agentId) {
    this.agentId = 'agent_' + Math.random().toString(36).substring(2, 9);
  }
});


export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
