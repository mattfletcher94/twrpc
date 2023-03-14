import { z } from "zod";
import { createHandler, createClient, defineRoute, defineRouter, isWRPCMessage } from "./twrpc";

const router = defineRouter({
  hello: defineRoute({
    input: z.object({
      name: z.string(),
    }),
    handler: ({ input }) => {
      return {
        message: `Hello ${input.name}`,
        coolStuff: {
          a: 1,
          b: 2,
        },
      };
    },
  }),
  subRouter: defineRouter({
    subRoute: defineRoute({
      input: z.object({
        ids: z.array(z.string()),
      }),
      handler: async ({ input }) => {
        return {
          ids: input.ids,
        };
      },
    }),
    test: defineRoute({
      input: z.object({
        name: z.string(),
      }),
      handler: ({ input }) => {
        return `Hello ${input.name}`;
      },
    }),
  }),
});

// Worker.js
(async function() {
    const wrpc = createHandler(router);

    onmessage = async (message) => {

        const response = await wrpc.handleMessage({
            message,
            ctx: {},
        })
        
        self.postMessage(response);
    }

    // export type Router = typeof router;

})();

// Frontend
(async function() {
    // import type Router from "./router";

    const client = createClient<typeof router>(new Worker("worker.js"));
    const result = await client.query("subRouter.test", { name: "John" });
    const result2 = await client.query('hello', { name: 'John' });

})();

