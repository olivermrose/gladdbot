import process from "node:process";
import type { Bot } from "@twurple/easy-bot";
import phrases from "../data/phrases.json";
import { model } from "./model";
import { redis } from "./redis";
import { sanitize } from "./util";

const interval = Number(process.env.CRON_JOB_INTERVAL);

for (let i = phrases.length - 1; i > 0; i--) {
	const j = (Math.random() * (i + 1)) | 0;
	[phrases[i], phrases[j]] = [phrases[j], phrases[i]];
}

export async function job(bot: Bot) {
	const stream = await bot.api.streams.getStreamByUserName("Gladd");
	if (!stream) return;

	const intervals = await redis.incr("intervals");
	if (intervals < interval / 5) return;

	if (Math.random() > 0.6) {
		const { response } = await model.generateContent(
			[
				"Do only one of the following:",
				// "- Give a controversial opinion",
				"- Insult Gladd",
				"- Say something random",
				// "- Take a dig at a random mod or user",
			].join("\n"),
		);

		await bot.say("Gladd", sanitize(response.text(), { limit: 350 }));
		return;
	}

	await bot.say("Gladd", phrases[(Math.random() * phrases.length) | 0]);
	await redis.set("intervals", 0);
}
