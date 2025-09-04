import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createCanvasInputSchema,
  updateCanvasInputSchema,
  createElementInputSchema,
  updateElementInputSchema,
  createChatMessageInputSchema,
  aiGenerateRequestSchema
} from './schema';

// Import handlers
import { createCanvas } from './handlers/create_canvas';
import { getCanvas } from './handlers/get_canvas';
import { updateCanvas } from './handlers/update_canvas';
import { getAllCanvases } from './handlers/get_all_canvases';
import { createElement } from './handlers/create_element';
import { updateElement } from './handlers/update_element';
import { getCanvasElements } from './handlers/get_canvas_elements';
import { deleteElement } from './handlers/delete_element';
import { createChatMessage } from './handlers/create_chat_message';
import { getChatMessages } from './handlers/get_chat_messages';
import { aiGenerateElements } from './handlers/ai_generate_elements';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Canvas management
  createCanvas: publicProcedure
    .input(createCanvasInputSchema)
    .mutation(({ input }) => createCanvas(input)),

  getCanvas: publicProcedure
    .input(z.string())
    .query(({ input }) => getCanvas(input)),

  updateCanvas: publicProcedure
    .input(updateCanvasInputSchema)
    .mutation(({ input }) => updateCanvas(input)),

  getAllCanvases: publicProcedure
    .query(() => getAllCanvases()),

  // Canvas element management
  createElement: publicProcedure
    .input(createElementInputSchema)
    .mutation(({ input }) => createElement(input)),

  updateElement: publicProcedure
    .input(updateElementInputSchema)
    .mutation(({ input }) => updateElement(input)),

  getCanvasElements: publicProcedure
    .input(z.string())
    .query(({ input }) => getCanvasElements(input)),

  deleteElement: publicProcedure
    .input(z.string())
    .mutation(({ input }) => deleteElement(input)),

  // Chat/AI functionality
  createChatMessage: publicProcedure
    .input(createChatMessageInputSchema)
    .mutation(({ input }) => createChatMessage(input)),

  getChatMessages: publicProcedure
    .input(z.string())
    .query(({ input }) => getChatMessages(input)),

  aiGenerateElements: publicProcedure
    .input(aiGenerateRequestSchema)
    .mutation(({ input }) => aiGenerateElements(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();