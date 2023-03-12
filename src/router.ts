/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod'

interface RouteConfig<I, O> {
  input: z.ZodSchema<I>
  handler: ({ input, ctx }: { input: I; ctx: any }) => O
}


function defineRoute<M, I, O>(config: RouteConfig<I, O>) {
  return {
    ...config,
  }
}

function defineRouter<T extends Record<string, any>>(routes: T) {
  return routes
}

const createApp = (router: ReturnType<typeof defineRouter>) => {
  return {
    handleMessage({
      message,
      ctx,
    }: {
      message: MessageEvent
      ctx: any;
    }) {
      const route = message.data.route.split('.')
      const input = message.data.input

      // Get the route config
      const routeConfig: ReturnType<typeof defineRoute> = route.reduce((acc: { [x: string]: any; }, curr: string) => {
        return acc[curr]
      }, router)

      if (!routeConfig) {
        return {
          WRPCError: {
            code: 404,
            message: `Route ${message.data.route} not found`,
          },
        }
      }

      try {
        const inputSchema = routeConfig.input
        const handler = routeConfig.handler
        const parsedInput = inputSchema.parse(input)
        return handler({ input: parsedInput, ctx })
      } catch (error : unknown) {
        if (error instanceof z.ZodError) {
          return {
            WRPCError: {
              code: 400,
              issues: error.issues,
            },
          }
        } else {
          return {
            WRPCError: {
              code: 500,
              message: error,
            },
          }
        }
      }

    }
  }
}

export {
  createApp,
  defineRoute,
  defineRouter,
}
