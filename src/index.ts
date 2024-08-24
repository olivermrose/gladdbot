import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import commands from "./commands";
import { auth } from "./auth";
import { job } from "./cron";
import { log } from "./util";

const BOT_USERNAMES = ["gladdbotai", "nightbot", "fossabot"];

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

let messages: string[] = [];

bot.onMessage(async (msg) => {
	if (BOT_USERNAMES.includes(msg.userName) || msg.text.startsWith("!")) return;

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
