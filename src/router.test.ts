import { beforeAll, describe, expect, it } from "vitest";
import { createApp, defineRoute, defineRouter } from "./router";
import { z } from "zod";

const router = defineRouter({
  hello: defineRoute({
    input: z.object({
      name: z.string(),
    }),
    handler: ({ input }) => {
      return `Hello ${input.name}`;
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
    input: defineRoute({
      input: z.object({
        name: z.string(),
      }),
      handler: ({ input }) => {
        return `Hello ${input.name}`;
      },
    }),
  }),
});

describe("router", () => {
  it("Should return the correct output", async () => {
    const result = await router.hello.handler({
      input: { name: "John" },
      ctx: {},
    });
    expect(result).toBe("Hello John");
  });

  it("Should return the correct output from a sub route", async () => {
    const result = await router.subRouter.subRoute.handler({
      input: { ids: ["1", "2"] },
      ctx: {},
    });
    expect(result).toEqual({ ids: ["1", "2"] });
  });

  it("Should not be able to access a sub route directly", async () => {
    expect(() => {
      // @ts-expect-error
      router.subRoute.handler({
        input: { ids: ["1", "2"] },
        ctx: {},
      });
    }).toThrow();
  });

});

const app = createApp(router)

type FlattenObjectKeys<T extends Record<string, unknown>, Key = keyof T> =
  Key extends string ?
    T[Key] extends Record<string, unknown> ?
      T[Key] extends ReturnType<typeof defineRouter>
        ? `${Key}.${FlattenObjectKeys<T[Key]>}`
        : `${Key}`
      : (Key extends 'input' ? never : (Key extends 'handler' ? '' : Key))
    : never

type FlatKeys = FlattenObjectKeys<typeof router>

// Remove trailing slash from FlatKeys
type TrimSlash<T extends string> = T extends `${infer A}.` ? TrimSlash<A> : T
type TrimmedFlatKeys = TrimSlash<FlatKeys>

// Add .handler to FlatKeys
type AddHandler<T extends string> = `${T}.handler`
type HandlerKeys = AddHandler<TrimmedFlatKeys>


describe("app", () => {

  it("Should return the correct output", async () => {
    const result = await app.handleMessage({
      message: {
        data: {
          route: "hello",
          input: {
            name: "John"
          }
        }
      } as MessageEvent,
      ctx: {}
    })
    expect(result).toBe("Hello John");
  });

  it("Should return the correct output from a sub route", async () => {
    const result = await app.handleMessage({
      message: {
        data: {
          route: "subRouter.subRoute",
          input: {
            ids: ["1", "2"]
          }
        }
      } as MessageEvent,
      ctx: {}
    })
    expect(result).toEqual({ ids: ["1", "2"] });
  });

  it("Should return a zod error if the input is invalid", async () => {
    const response = app.handleMessage({
      message: {
        data: {
          route: "hello",
          input: {
            name: 1
          }
        }
      } as MessageEvent,
      ctx: {}
    })

    expect(response).toEqual({
      WRPCError: {
        code: 400,
        issues: [
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["name"],
            message: "Expected string, received number"
          }
        ]
      }
    })
  });

  it("Should return a 404 if the route is not found", async () => {
    const response = app.handleMessage({
      message: {
        data: {
          route: "hello.notFound",
          input: {
            name: "John"
          }
        }
      } as MessageEvent,
      ctx: {}
    })
    expect(response).toEqual({
      WRPCError: {
        code: 404,
        message: "Route hello.notFound not found"
      }
    })
  });

});