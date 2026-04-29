import { config } from "dotenv";
config({ path: "server/.env" });
import { createApp } from "./app.js";
import { createStorage } from "./storage/index.js";

const PORT = process.env.PORT ?? 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const storage = await createStorage("mongo", { uri: MONGODB_URI });
const app = await createApp(storage);

app.listen(PORT, () => {
  console.info(`Server running on port ${PORT}`);
});
