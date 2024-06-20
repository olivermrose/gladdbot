import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import phrases from "../data/havok.json";
import commands from "./commands";
import { auth } from "./auth";
import { redis } from "./redis";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

for (let i = phrases.length - 1; i > 0; i--) {
	const j = (Math.random() * (i + 1)) | 0;
	[phrases[i], phrases[j]] = [phrases[j], phrases[i]];
}

Cron(
	"*/15 * * * *",
	async () => {
		const stream = await bot.api.streams.getStreamByUserName("Gladd");
		if (!stream) return;

		const intervals = await redis.incr("intervals");
		if (intervals !== 3) return;

		await bot.say("Gladd", phrases[(Math.random() * phrases.length) | 0]);
		await redis.set("intervals", 0);
	},
	{ timezone: "America/New_York" },
);
