import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import havok from "../data/havok.json";
import commands from "./commands";
import { auth } from "./auth";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

Cron(
	"*/30 * * * *",
	async () => {
		const stream = await bot.api.streams.getStreamByUserName("Gladd");
		if (!stream) return;

		await bot.say("Gladd", havok[(Math.random() * havok.length) | 0]);
	},
	{ timezone: "America/New_York" },
);
