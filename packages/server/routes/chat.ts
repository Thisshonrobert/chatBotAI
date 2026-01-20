import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import z from 'zod';
import fs from 'fs';
import path from 'path';
import { type Request, type Response } from 'express';
import template from '../prompts/chatbot.txt';
const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
   throw new Error('GEMINI_API_KEY is not defined');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const parkInfo = fs.readFileSync(
   path.join(__dirname, '..', 'prompts', 'WonderWorld.md'),
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

const conversations = new Map<string, string>();

router.post('/chat', async (req: Request, res: Response) => {
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
         // @ts-ignore
         message: interaction.outputs[interaction.outputs.length - 1]!.text,
      });
   } catch (error) {
      res.status(500).json({
         error: 'Free Tier quota exceeded or request failed',
      });
   }
});

export const chatRouter = router;
