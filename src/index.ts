import process from "node:process";
import { Cron } from "croner";
import { Bot } from "@twurple/easy-bot";
import commands from "./commands";
import { auth } from "./auth";
import { job } from "./cron";
import { MessageQueue } from "./queue";
import { log } from "./util";

const BOT_USERNAMES = ["gladdbotai", "nightbot", "fossabot"];

const cronEnabled = Number(process.env.CRON_JOB_ENABLED);
const mq = new MessageQueue();

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

bot.chat.onMessage(async (_channel, user, text, msg) => {
	if (BOT_USERNAMES.includes(user) || text.startsWith("!")) return;

	const subBadge = Number(msg.userInfo.badges.get("subscriber")) > 3;

	if (cronEnabled && subBadge) {
		mq.add(`${msg.userInfo.displayName}: ${text}`);
	}
});

if (cronEnabled) {
	new Cron(
		`*/5 * * * *`,
		async () => {
			if (!mq.messages.length) return;

			await job(bot, mq.messages);
			mq.clear();
		},
		{ timezone: "America/New_York" },
	);
}
