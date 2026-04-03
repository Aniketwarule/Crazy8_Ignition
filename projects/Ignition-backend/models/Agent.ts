import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  description: string;
  price: number;
  creatorWallet: string;
  hostingType: 'internal' | 'external';
  baseModel?: string;      // required if internal
  systemPrompt?: string;   // required if internal
  endpointUrl?: string;    // required if external
}

const AgentSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  creatorWallet: { type: String, required: true },
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
    required: function(this: any) { return this.hostingType === 'external'; } 
  }
}, { timestamps: true });

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
