import { Button } from '../ui/button';
import { FaArrowUp } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import popSound from '@/assets/sounds/pop.mp3';
import notificationSound from '@/assets/sounds/notification.mp3';

type FormData = {
   prompt: string;
};

type ResponseData = {
   message: string;
};

type Message = {
   role: 'user' | 'assistant';
   content: string;
};

const pop: HTMLAudioElement = new Audio(popSound);
const notification: HTMLAudioElement = new Audio(notificationSound);

pop.volume = 0.5;
notification.volume = 0.5;

const ChatBot = () => {
   const { register, handleSubmit, reset, formState } = useForm<FormData>();
   const [message, setMessage] = useState<Message[]>([]);
   const [botTyping, setBotTyping] = useState(false);
   const [error, setError] = useState<string>();
   const lastMessageRef = useRef<HTMLDivElement | null>(null);
   const conversationId = useRef(crypto.randomUUID());

   useEffect(() => {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [message]);

   const onSubmit = async ({ prompt }: FormData) => {
      try {
         setMessage((prev) => [...prev, { role: 'user', content: prompt }]);
         setBotTyping(true);
         setError('');
         pop.play();
         reset({ prompt: '' });
         const { data } = await axios.post<ResponseData>('/api/chat', {
            prompt,
            conversationId: conversationId.current,
         });
         setMessage((prev) => [
            ...prev,
            { role: 'assistant', content: data.message },
         ]);
         notification.play();
      } catch (error) {
         console.error(error);
         setError('Something went wrong..!');
      } finally {
         setBotTyping(false);
      }
   };

   return (
      <div className="flex flex-col h-full">
         <div className="flex flex-col mb-10 gap-2 flex-1">
            {message.map((item, index) => (
               <div
                  key={index}
                  ref={index === message.length - 1 ? lastMessageRef : null}
                  className={`px-3 py-2 rounded-3xl max-w-md
                    ${item.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 text-black self-start'}`}
               >
                  <ReactMarkdown>{item.content}</ReactMarkdown>
               </div>
            ))}
            {botTyping && (
               <div className="flex items-center gap-1 px-4 py-3 bg-gray-100 rounded-2xl self-start">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce-custom [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce-custom [animation-delay:200ms]"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce-custom [animation-delay:400ms]"></div>
               </div>
            )}
            {error && <div className="text-red-500 text-sm">{error}</div>}
         </div>
         <form
            className="flex flex-col gap-2 items-end border-2 p-4 rounded-3xl"
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
               }
            }}
         >
            <textarea
               {...register('prompt', {
                  required: true,
                  validate: (data) => data.trim().length > 0,
               })}
               autoFocus
               className="w-full border-0 focus:outline-0 resize-none"
               placeholder="Ask anything"
               maxLength={1000}
            />
            <Button
               disabled={!formState.isValid}
               className="rounded-full w-9 h-9"
            >
               <FaArrowUp />
            </Button>
         </form>
      </div>
   );
};

export default ChatBot;
