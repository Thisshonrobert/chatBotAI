import { Router, type Request, type Response } from 'express';
import { prisma } from '../prisma/db';
import { GoogleGenAI } from '@google/genai';
import summarizePrompt from '../prompts/summarize-reviews.txt';
import dayjs from 'dayjs';
import { Ollama } from 'ollama';

const router = Router();

const ollamaClient = new Ollama();

router.get('/products/:id/reviews', async (req: Request, res: Response) => {
   const productId = Number(req.params.id);
   if (isNaN(productId)) {
      return res.status(400).json('Invalid productId');
   }
   const [reviews, summary] = await Promise.all([
      prisma.review.findMany({
         where: { productId },
         orderBy: { createdAt: 'desc' },
      }),
      prisma.summary.findFirst({
         where: {
            AND: [{ productId }, { expiresAt: { gt: new Date() } }],
         },
      }),
   ]);

   return res.status(200).json({
      summary: summary?.content ?? null,
      reviews,
   });
});

router.get('/products/:id/', async (req: Request, res: Response) => {
   const productId = Number(req.params.id);
   if (isNaN(productId)) {
      return res.status(400).json('Invalid productId');
   }
   try {
      const product = await prisma.product.findUnique({
         where: {
            id: productId,
         },
      });

      if (!product) {
         return res.status(404).json({
            error: 'product not found',
         });
      }

      res.status(200).json({
         product: product,
      });
   } catch (error) {
      console.error(error);
      return res.status(500).json({
         error: 'Failed to fetch product',
      });
   }
});

router.post(
   '/products/:id/reviews/summarize',
   async (req: Request, res: Response) => {
      const productId = Number(req.params.id);

      if (isNaN(productId)) {
         return res.status(400).json({ error: 'Invalid productId' });
      }

      const product = await prisma.product.findUnique({
         where: { id: productId },
      });

      if (!product) {
         return res.status(404).json({ error: 'Product not found' });
      }

      const now = new Date();
      const expires = dayjs().add(7, 'days').toDate();

      try {
         //  Check existing summary

         const existingSummary = await prisma.summary.findFirst({
            where: {
               AND: [{ productId }, { expiresAt: { gt: new Date() } }],
            },
         });

         if (existingSummary) {
            return res.status(200).json({ summary: existingSummary.content });
         }

         const reviews = await prisma.review.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            take: 10,
         });

         if (reviews.length === 0) {
            return res.status(200).json({
               summary: null,
               reviews: [],
            });
         }

         const joinedReviews = reviews.map((r) => r.content).join('\n\n');

         const generatedSummary = await ollamaClient.chat({
            model: 'tinyllama',
            messages: [
               {
                  role: 'system',
                  content: summarizePrompt,
               },
               {
                  role: 'user',
                  content: joinedReviews,
               },
            ],
         });

         const finalSummary = generatedSummary.message.content;

         if (!generatedSummary) {
            return res.status(500).json({ error: 'AI returned empty summary' });
         }

         await prisma.summary.upsert({
            where: { productId },
            create: {
               content: finalSummary,
               generatedAt: now,
               expiresAt: expires,
               productId,
            },
            update: {
               content: finalSummary,
               generatedAt: now,
               expiresAt: expires,
            },
         });

         return res.status(201).json({ summary: finalSummary });
      } catch (error) {
         console.error('[ERROR] Summarization failed:', error);
         return res.status(500).json({ error: 'Failed to summarize reviews' });
      }
   }
);

export const sumRouter = router;
