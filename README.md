# twRPC (Beta)
Inspired by [trpc](https://trpc.io/), TWRPC is a library for creating type-safe, strongly-typed, and easy-to-use RPCs in TypeScript. It is designed to be used in web workers, but can be used in any environment that supports `postMessage`.

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

export {
  router,
  Router,
};
```

## Using twRPC in a worker

```ts
// Worker.ts
import { createApp } from 'twrpc'
import { router } from './my-router'

// Create an instance of twrpc
const twrpc = createApp(router);

// Handle message events
onmessage = async (message) => {
  const response = await twrpc.handleMessage({
    message, 
    ctx: {}, // You can pass in any context you want here and will be available in your handlers
  })
  self.postMessage(response);
}
```

## Querying the router from the client

```ts
// client.ts
import { createClient } from 'twrpc'
import type { Router } from './my-router'

// Create a client instance
const client = createClient<Router>(new Worker("worker.js"));

// Query routes
const helloResult = await client.query("hello", { name: "John" });

const getOneResult = await client.query("subRouter.getOne", { id: "123" });

const getManyResult = await client.query("subRouter.getMany", { ids: ["123", "456"] });
```

## License
This library is licensed under the MIT License. See the LICENSE file for details.