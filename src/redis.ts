import process from "node:process";
import { createClient } from "redis";

export const redis = await createClient({ url: process.env.REDIS_URL }).connect();

redis.on("error", (error) => {
	console.error(error);
});
