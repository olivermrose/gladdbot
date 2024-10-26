import process from "node:process";
import postgres from "postgres";
import { createClient } from "redis";

export const sql = postgres(process.env.POSTGRES_URL!);

export const redis = await createClient({ url: process.env.REDIS_URL }).connect();

redis.on("error", (error) => {
	console.error(error);
});
