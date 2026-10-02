import app from "./app";
import { logger } from "./lib/logger";
import { cleanupExpiredFixMateUploads } from "./lib/objectStorage";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "Server startup failed");
  process.exit(1);
});

const cleanupTimer = setInterval(() => {
  cleanupExpiredFixMateUploads()
    .then((deleted) => {
      if (deleted) logger.info({ deleted }, "Expired FixMate uploads removed");
    })
    .catch((error) => logger.warn({ err: error }, "Upload cleanup could not run"));
}, 10 * 60_000);
cleanupTimer.unref();

cleanupExpiredFixMateUploads().catch((error) =>
  logger.warn({ err: error }, "Initial upload cleanup could not run"),
);
