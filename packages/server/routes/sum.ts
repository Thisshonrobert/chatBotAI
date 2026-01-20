import { Router } from 'express';
import { type Request, type Response } from 'express';
import { prisma } from '../prisma/db';
import { GoogleGenAI } from '@google/genai';
import template from '../prompts/summarize-reviews.txt';
import dayjs from 'dayjs';

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
   throw new Error('GEMINI_API_KEY is not defined');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

router.get('/products/:id/reviews', async (req: Request, res: Response) => {
   const productId = Number(req.params.id);

   if (isNaN(productId)) {
      return res.status(400).json('Invalid productId');
   }

   const reviews = await prisma.review.findMany({
      where: {
         productId: productId,
      },
      orderBy: {
         createdAt: 'desc',
      },
   });
   res.json(reviews);
});

router.post(
   '/products/:id/reviews/summarize',
   async (req: Request, res: Response) => {
      const productId = Number(req.params.id);
      const now = new Date();
      const expires = dayjs().add(7, 'days').toDate();

      if (isNaN(productId)) {
         return res.status(400).json('Invalid productId');
      }

      const existingSummary = await prisma.summary.findUnique({
         where: { productId: productId },
      });

      if (existingSummary && existingSummary.expiresAt > now) {
         return existingSummary.content;
      }

      const reviews = await prisma.review.findMany({
         where: {
            productId: productId,
         },
         orderBy: {
            createdAt: 'desc',
         },
         take: 10,
      });

      const joinedReviews = reviews.map((r) => r.content).join('\n\n');
      const prompt = template.replace('{{reviews}}', joinedReviews);

      try {
         const { text: summary } = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
               temperature: 0.2,
               maxOutputTokens: 500,
            },
         });
         const data = {
            content: summary!,
            generatedAt: now,
            expiresAt: expires,
            productId,
         };

         try {
            await prisma.summary.upsert({
               where: {
                  productId,
               },
               create: data,
               update: data,
            });

            res.json({ message: summary });
         } catch (error) {
            res.status(400).json({
               error: 'error while creating/updating summary',
            });
         }
      } catch (error) {
         console.error(error);
         res.status(500).json({ error: 'Generation failed' });
      }
   }
);

export const sumRouter = router;
