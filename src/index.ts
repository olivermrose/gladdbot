import process from "node:process";
import { Bot } from "@twurple/easy-bot";
import { Cron } from "croner";
import { auth } from "./auth";
import commands from "./commands";
import { job } from "./cron";
import { sql } from "./db";
import { MessageQueue } from "./queue";
import { log } from "./util";

const BOT_USERNAMES = ["blerp", "fossabot", "gladdbotai", "nightbot"];

const cronEnabled = Number(process.env.CRON_JOB_ENABLED);
const mq = new MessageQueue();

interface Message {
	username: string;
	content: string;
}

let buffer: Message[] = [];

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

	buffer.push({
		username: msg.userInfo.displayName,
		content: text,
	});

	if (buffer.length >= 100) {
		await flush();
	}
});

async function flush() {
	if (!buffer.length) return;

	const toInsert = buffer;
	buffer = [];

	try {
		await sql`
			INSERT INTO messages (
				username,
				content
			) VALUES ${sql(toInsert.map((m) => [m.username, m.content]))}
		`;
	} catch (error) {
		console.error("Error inserting messages");
		console.error(error);

		buffer = toInsert;
	}
}

new Cron("*/20 * * * *", async () => await flush(), { timezone: "America/New_York" });

if (cronEnabled) {
	new Cron(
		"*/5 * * * *",
		async () => {
			if (!mq.messages.length) return;

			await job(bot, mq.messages);
			mq.clear();
		},
		{ timezone: "America/New_York" },
	);
}
