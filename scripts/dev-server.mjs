import { createServer } from "vite";

const server = await createServer({
  configFile: "./vite.config.js",
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 3000),
    strictPort: true,
    allowedHosts: true,
  },
});

await server.listen();
server.printUrls();

const shutdown = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
