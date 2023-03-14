# twRPC (Typescript-Worker Remote Procedure Call)
twRPC is a remote procedure call library for TypeScript that is designed to be used primarily within WebWorkers. Inspired by [tRPC](https://trpc.io/), twRPC uses [Zod](https://zod.dev/) for type validation and provides a type-safe and simple way to define routes and handlers.

## Installation
You can install this library using npm:

```npm install twrpc```

## Defining a router
```ts
// my-router.ts
import { defineRouter, defineRoute } from 'twrpc'
import { z } from 'zod'

const router = defineRouter({
  hello: defineRoute({
    input: z.object({
      name: z.string(),
    }),
    handler: ({ input }) => {
      return {
        message: `Hello ${input.name}`,
      };
    },
  }),
  subRouter: defineRouter({
    getOne: defineRoute({
      input: z.object({
        id: z.string(),
      }),
      handler: ({ input }) => {
        return `Got one with id ${input.id}`;
      },
    }),
    getMany: defineRoute({
      input: z.object({
        ids: z.array(z.string()),
      }),
      handler: ({ input }) => {
        return {
          message: `Got ${input.ids.length} items`,
          ids: input.ids,
        }
      },
    }),
  }),
});

// Also export the router type for use on the client
type Router = typeof router;

export { router };
export type { Router };
```

## Using your twRPC router in a WebWorker

```ts
// worker.ts
import { createHandler } from 'twrpc'
import { router } from './my-router'

// Create an instance of twrpc app
const twrpc = createHandler(router);

// Handle message events
onmessage = async (message) => {
  const response = await twrpc.handleMessage({
    message, 
    ctx: {}, // You can pass in any context you want here and will be available in your handlers
  })
  self.postMessage(response);
}
```

## Querying your twRPC router from the client

```ts
// client.ts
import { createClient } from 'twrpc'
import type { Router } from './my-router'

// Create a client instance (pass router type as generic)
const client = createClient<Router>(new Worker("worker.js"));

// Query routes with type-safe input and output
const helloResult = await client.query("hello", { name: "John" });
const getOneResult = await client.query("subRouter.getOne", { id: "123" });
const getManyResult = await client.query("subRouter.getMany", { ids: ["123", "456"] });
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. Please note I am new to Open Source and am still learning best practices, so please feel free
to offer any advice or suggestions.

## License
[MIT](https://opensource.org/license/mit/)

Copyright (c) 2023-present Matt Fletcher