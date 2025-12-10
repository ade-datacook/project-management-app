import "dotenv/config";
import { createApp, startServer } from "./_core/index.js";

const app = createApp();
const runningInPassenger = Boolean(process.env.PASSENGER_APP_ENV);

if (!runningInPassenger) {
  startServer(app).catch(console.error);
}

export default app;
