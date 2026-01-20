import express from 'express';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat';
import { sumRouter } from './routes/sum';

dotenv.config();

const PORT = 3000;

const app = express();

app.use(express.json());

app.use('/api/chatBot', chatRouter);
app.use('/api/sum', sumRouter);

app.listen(PORT, () => {
   console.log('lISTENING ON PORT 3000');
});
