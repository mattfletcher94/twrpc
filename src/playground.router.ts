import { z } from "zod";
import { defineRouter, defineRoute } from "./twrpc";

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

export { router };
