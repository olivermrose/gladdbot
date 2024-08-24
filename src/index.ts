import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import commands from "./commands";
import { auth } from "./auth";
import { job } from "./cron";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

let messages: string[] = [];

bot.onMessage((msg) => {
	if (msg.userDisplayName === "GladdBotAI") return;

	messages.push(`${msg.userDisplayName}: ${msg.text}`);

	if (messages.length > 25) {
		messages = messages.slice(0, 25);
	}
});

Cron(
	`*/5 * * * *`,
	async () => {
		await job(bot, messages);
		messages = [];
	},
	{ timezone: "America/New_York" },
);
