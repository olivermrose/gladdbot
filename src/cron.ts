import process from "node:process";
import type { Bot } from "@twurple/easy-bot";
import { redis } from "./db";
import { model } from "./model";
import { handleError, sanitize } from "./util";

const interval = Number(process.env.CRON_JOB_INTERVAL);

export async function job(bot: Bot, messages: string[]) {
	const stream = await bot.api.streams.getStreamByUserName("Gladd");
	if (!stream) return;

	const intervals = await redis.incr("intervals");
	if (intervals < interval / 5) return;

	try {
		const { response } = await model.generateContent(`
			Respond to ONLY ONE of these messages without repeating what it said.
			===================
			${messages.join("\n")}
		`);

		await bot.say("Gladd", sanitize(response.text(), { limit: 350 }));
		await redis.set("intervals", 0);
	} catch (error) {
		handleError(error);
	}
}
