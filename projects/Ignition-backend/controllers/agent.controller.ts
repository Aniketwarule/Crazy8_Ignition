import { Request, Response } from 'express';
import Agent from '../models/Agent';

export const createAgent = async (req: Request, res: Response) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();

    res.status(201).json({
      message: "Agent created successfully",
      agent
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAgents = async (_req: Request, res: Response) => {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 });

    res.status(200).json(agents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};