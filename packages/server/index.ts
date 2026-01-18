import express from 'express';
import dotenv from 'dotenv';
import { type Request, type Response } from 'express';
import { GoogleGenAI, Interactions } from '@google/genai';
import z from 'zod';
import fs from 'fs';
import path from 'path';
import template from './prompts/chatbot.txt';

dotenv.config();

const PORT = 3000;

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const parkInfo = fs.readFileSync(
   path.join(__dirname, 'prompts', 'WonderWorld.md'),
   'utf-8'
);
const instructions = template.replace('{{parkInfo}}', parkInfo);

const schema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'prompt required')
      .max(1000, 'max character is 1000'),
   conversationId: z.uuid(),
});

// const conversations = new Map<string, any[]>();
const conversations = new Map<string, string>();

// app.post('/api/chat', async (req: Request, res: Response) => {
//    const safeParesed = schema.safeParse(req.body);

//    if (!safeParesed.success) {
//       res.status(400).json(safeParesed.error.format());
//       return;
//    }

//    const { prompt, conversationId } = safeParesed.data;

//    // 1. Get history or start a new one
//    const history = conversations.get(conversationId) || [];

//    // 2. Add the new user prompt to the history
//    const updatedHistory = [
//       ...history,
//       { role: 'user', parts: [{ text: prompt }] },
//    ];

//    try {
//       const airesponse = await ai.models.generateContent({
//          model: 'gemini-2.5-flash',
//          contents: updatedHistory,
//          config: {
//             systemInstruction: instructions,
//             temperature: 0.2,
//             maxOutputTokens: 200,
//          },
//       });

//       const botMessage = { role: 'model', parts: [{ text: airesponse.text }] };
//       conversations.set(conversationId, [...updatedHistory, botMessage]);

//       res.json({ message: airesponse.text });
//    } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Generation failed' });
//    }
// });

app.post('/api/chat', async (req: Request, res: Response) => {
   const safeParsed = schema.safeParse(req.body);

   if (!safeParsed.success) {
      res.status(400).json(safeParsed.error.format());
      return;
   }
   const { prompt, conversationId } = safeParsed.data;
   const lastId = conversations.get(conversationId);

   try {
      const interaction = await ai.interactions.create({
         model: 'gemini-2.5-flash',
         input: prompt,
         previous_interaction_id: lastId,
         system_instruction: instructions,
         generation_config: {
            temperature: 0.2,
            max_output_tokens: 200,
         },
      });

      conversations.set(conversationId, interaction.id);
      // @ts-ignore
      res.json({
         message: interaction.outputs[interaction.outputs.length - 1]!.text,
      });
   } catch (error) {
      res.status(500).json({
         error: 'Free Tier quota exceeded or request failed',
      });
   }
});

app.listen(PORT, () => {
   console.log('lISTENING ON PORT 3000');
});
