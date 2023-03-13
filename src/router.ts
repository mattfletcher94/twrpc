/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

interface RouteConfig<I, O> {
  input: z.ZodSchema<I>;
  handler: ({ input, ctx }: { input: I; ctx: any }) => O;
}

function defineRoute<I, O>(config: RouteConfig<I, O>) {
  return {
    ...config,
  };
}

function defineRouter<T extends Record<string, any>>(routes: T) {
  return routes;
}

function createApp(router: ReturnType<typeof defineRouter>) {
  return {
    async handleMessage({ message, ctx }: { message: MessageEvent; ctx: any }) {
      const queryId = message.data.WRPC.queryId;
      const route = message.data.WRPC.route.split(".");
      const input = message.data.WRPC.input;

      // Get the route config
      const routeConfig: ReturnType<typeof defineRoute> = route.reduce(
        (acc: { [x: string]: any }, curr: string) => {
          return acc[curr];
        },
        router
      );

      if (!routeConfig) {
        return {
          WRPC: {
            status: 404,
            queryId,
            message: `Route ${message.data.WRPC.route} not found`,
          },
        };
      }

      try {
        const inputSchema = routeConfig.input;
        const handler = routeConfig.handler;
        const parsedInput = inputSchema.parse(input);
        return {
          WRPC: {
            status: 200,
            queryId,
            payload: await handler({ input: parsedInput, ctx }),
          },
        };
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          return {
            WRPC: {
              status: 400,
              queryId,
              error: error.issues,
            },
          };
        } else {
          return {
            WRPC: {
              status: 500,
              queryId,
              error,
            },
          };
        }
      }
    },
  };
}

function isWRPCMessage(message: MessageEvent) {
  return message?.data?.WRPC ? true : false;
}

type GenerateRouterPaths<T extends ReturnType<typeof defineRouter>> =
  T extends { [k: string]: any }
    ? {
        [P in keyof T & string]: `${P}${T[P] extends { handler: any }
          ? ""
          : `.${GenerateRouterPaths<T[P]>}`}`;
      }[keyof T & string]
    : never;

// Extracts the input type of a route.
type ExtractRouteInput<Config> = Config extends { input: z.ZodSchema<infer T> }
  ? T
  : never;

// Extracts the output type of a route handler.
type ExtractRouteOutput<Config> = Config extends {
  handler: (...args: any[]) => infer T;
}
  ? T
  : never;

// Looks up the type of a route by its path.
type LookupRoute<T, Path extends string> = Path extends keyof T
  ? T[Path]
  : Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? LookupRoute<T[Key], Rest>
    : never
  : never;

// Extracts the input type of a route by its path.
type RoutePathToRouteInput<Router, Path extends string> = ExtractRouteInput<
  LookupRoute<Router, Path>
>;

// Extracts the output type of a route by its path.
type RouterPathToRouteOutput<Router, Path extends string> = ExtractRouteOutput<
  LookupRoute<Router, Path>
>;

// If the type is not a promise, wrap it in a promise.
type WrapWithPromiseIfNot<T> = T extends Promise<any> ? T : Promise<T>;

// Create the front end client for a given router.
function createClient<Router extends ReturnType<typeof defineRouter>>(
  worker: Worker,
) {
  // Convert the above query to a function
  function query<Path extends GenerateRouterPaths<Router>>(
    path: Path,
    input: RoutePathToRouteInput<Router, Path>
  ): WrapWithPromiseIfNot<RouterPathToRouteOutput<Router, Path>> {
    return new Promise((resolve, reject) => {
      const queryId = uuidv4();
      const listener = (event: MessageEvent) => {
        if (event.data.WRPC?.queryId === queryId) {
          worker.removeEventListener("message", listener);
          if (event.data.WRPC.status === 200) {
            resolve(event.data.WRPC.payload);
          } else {
            reject(event.data.WRPC);
          }
        }
      };
      worker.addEventListener("message", listener);
      worker.postMessage({
        WRPC: {
          queryId,
          route: path,
          input,
        },
      });
    }) as WrapWithPromiseIfNot<RouterPathToRouteOutput<Router, Path>>;
  }

  return {
    query,
  };
}

/*
type PrettifyRouter<T> = {
  [K in keyof T]: T[K] extends { handler: any } ? {
    input: ExtractRouteInput<T[K]>;
    output: ExtractRouteOutput<T[K]>;
  } : {
    [SK in keyof T[K]]: T[K][SK] extends { handler: any } ? {
      input: ExtractRouteInput<T[K][SK]>;
      output: ExtractRouteOutput<T[K][SK]>;
    } : never;
  };
}
type Router = typeof router;
type PrettifiedRouter = PrettifyRouter<Router>;
type UnwrapPrettifiedRouter<T> = {
  [K in keyof T]: T[K] extends { input: infer I, output: infer O } ? {
    input: I;
    output: O;
  } : {
    [SK in keyof T[K]]: T[K][SK] extends { input: infer I, output: infer O } ? {
      input: I;
      output: O;
    } : never;
  };
}*/

export { createApp, createClient, defineRoute, defineRouter, isWRPCMessage };
