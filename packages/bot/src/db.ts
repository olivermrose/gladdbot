import process from "node:process";
import postgres from "postgres";
import { createClient } from "redis";

export const sql = postgres(process.env.POSTGRES_URL!);

export const redis = await createClient({ url: process.env.REDIS_URL }).connect();

type CounterKey = "clydes" | "intervals" | "responses" | "responses_auto" | "responses_mention";

export async function increment(counter: CounterKey) {
	if (process.env.NODE_ENV !== "dev") {
		const value = await redis.incr(counter);
		return value;
	}

	return 0;
}
