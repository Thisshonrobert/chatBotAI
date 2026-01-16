import express from 'express';
import dotenv from 'dotenv';
import { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import z from 'zod';

dotenv.config();

const PORT = 3000;

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const schema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'prompt required')
      .max(1000, 'max character is 1000'),
   conversationId: z.uuid(),
});

const conversations = new Map<string, any[]>();

app.post('/api/chat', async (req: Request, res: Response) => {
   const safeParesed = schema.safeParse(req.body);

   if (!safeParesed.success) {
      res.status(400).json(safeParesed.error.format());
      return;
   }

   const { prompt, conversationId } = safeParesed.data;

   // 1. Get history or start a new one
   const history = conversations.get(conversationId) || [];

   // 2. Add the new user prompt to the history
   const updatedHistory = [
      ...history,
      { role: 'user', parts: [{ text: prompt }] },
   ];

   try {
      const airesponse = await ai.models.generateContent({
         model: 'gemini-2.5-flash',
         contents: updatedHistory,
         config: {
            temperature: 0.2,
            maxOutputTokens: 200,
         },
      });

      const botMessage = { role: 'model', parts: [{ text: airesponse.text }] };
      conversations.set(conversationId, [...updatedHistory, botMessage]);

      res.json({ message: airesponse.text });
   } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Generation failed' });
   }
});

app.listen(PORT, () => {
   console.log('lISTENING ON PORT 3000');
});
