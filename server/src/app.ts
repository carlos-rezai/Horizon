import express from "express";
import mongoose from "mongoose";
import accountsRouter from "./routes/accounts.js";

export async function createApp(mongoUri: string) {
  await mongoose.connect(mongoUri);

  const app = express();
  app.use(express.json());
  app.use("/accounts", accountsRouter);

  return app;
}
