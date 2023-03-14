import { createHandler } from "./twrpc";
import { router } from "./playground.router";

const app = createHandler(router);

self.addEventListener("message", async (message) => {
    const response = await app.handleMessage({
        message,
        ctx: {},
    });
    self.postMessage(response);
});