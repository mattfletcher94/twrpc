import { describe, expect, it } from "vitest";
import { createApp, createClient, defineRoute, defineRouter } from "./router";
import { z } from "zod";

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

const app = createApp(router);

describe("router", () => {

  it("should return 404 if route is not found", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "notFound",
            input: {},
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(404);
  });

  it("should return 200 if route is found", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "hello",
            input: {
              name: "Bob",
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(200);
  });

  it("should return 200 if sub route is found", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "subRouter.test",
            input: {
              name: "Bob",
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(200);
  });

  it("should return 400 if input is invalid", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "hello",
            input: {
              name: 123,
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(400);
  });

  it("should return 200 if input is valid", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "hello",
            input: {
              name: "Bob",
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(200);
  });

  it("should return 200 if sub route input is valid", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "subRouter.subRoute",
            input: {
              ids: ["1", "2", "3"],
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(200);
  });

  it("should return 400 if sub route input is invalid", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "subRouter.subRoute",
            input: {
              ids: [1, 2, 3],
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.status).toBe(400);
  });

  it("should return correct response if route is found", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "hello",
            input: {
              name: "Bob",
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.payload).toEqual({
      message: "Hello Bob",
      coolStuff: {
        a: 1,
        b: 2,
      },
    });
  });

  it("should return correct response if sub route is found", async () => {
    const response = await app.handleMessage({
      message: {
        data: {
          WRPC: {
            route: "subRouter.test",
            input: {
              name: "Bob",
            },
          },
        },
      } as MessageEvent,
      ctx: {},
    });
    expect(response.WRPC.payload).toEqual("Hello Bob");
  });

  

});

const worker = new Worker(new URL("./router.test.worker.ts", import.meta.url), { type: "module" });
const client = createClient<typeof router>(worker);

describe("client", () => {

  it("should return 404 if route is not found", async () => {
    try {
      // @ts-expect-error
      await client.query("notFound");
    } catch (error: any) {
      expect(error.status).toBe(404);
    }
  });

  it("should return correct response if route is found", async () => {
    const response = await client.query("hello", { name: "Bob" });
    expect(response).toEqual({
      message: "Hello Bob",
      coolStuff: {
        a: 1,
        b: 2,
      },
    });
  });

  it("should return correct response if sub route is found", async () => {
    const response = await client.query("subRouter.test", { name: "Bob" });
    expect(response).toEqual("Hello Bob");
  });

  it("should return 400 if input is invalid", async () => {
    try {
      // @ts-expect-error
      await client.query("hello", { name: 123 });
    } catch (error: any) {
      expect(error.status).toBe(400);
    }
  });

});