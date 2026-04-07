import { config } from "dotenv";
config({ path: "server/.env" });
import { createApp } from "./app.js";

const PORT = process.env.PORT ?? 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const app = await createApp(MONGODB_URI);

app.listen(PORT, () => {
  console.info(`Server running on port ${PORT}`);
});
