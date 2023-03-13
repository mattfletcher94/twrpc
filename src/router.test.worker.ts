import { createApp } from "./router";
import { router } from "./playground.router";

const app = createApp(router);

self.addEventListener("message", async (message) => {
    const response = await app.handleMessage({
        message,
        ctx: {},
    });
    self.postMessage(response);
});