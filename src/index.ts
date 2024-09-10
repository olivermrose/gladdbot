import process from "node:process";
import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import commands from "./commands";
import { auth } from "./auth";
import { job } from "./cron";
import { MessageQueue } from "./queue";
import { log } from "./util";

const BOT_USERNAMES = ["gladdbotai", "nightbot", "fossabot"];

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

const mq = new MessageQueue();

bot.onMessage(async (msg) => {
	if (BOT_USERNAMES.includes(msg.userName) || msg.text.startsWith("!")) return;

	mq.add(`${msg.userDisplayName}: ${msg.text}`);
});

if (process.env.CRON_JOB_ENABLED) {
	Cron(
		`*/5 * * * *`,
		async () => {
			await job(bot, mq.messages);
			mq.clear();
		},
		{ timezone: "America/New_York" },
	);
}
