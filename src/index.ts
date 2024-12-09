import process from "node:process";
import type { ChatSession } from "@google/generative-ai";
import { Bot } from "@twurple/easy-bot";
import { Cron } from "croner";
import { yellow } from "kleur/colors";
import { auth } from "./auth";
import commands from "./commands";
import { job } from "./cron";
import { redis, sql } from "./db";
import { generate, model } from "./model";
import { MessageQueue } from "./queue";
import { formatPrompt, log } from "./util";

const BOT_USERNAMES = ["blerp", "fossabot", "gladdbotai", "nightbot"];

const cronEnabled = Number(process.env.CRON_JOB_ENABLED);
const mq = new MessageQueue();

interface Message {
	username: string;
	content: string;
	sentAt: Date;
}

let buffer: Message[] = [];
const chats = new Map<string, ChatSession>();

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

bot.chat.onMessage(async (channel, user, text, msg) => {
	if (BOT_USERNAMES.includes(user) || text.startsWith("!")) return;

	if (/@?gladd ?bot(?:ai)?/i.test(text)) {
		if (msg.isReply) {
			let chat: ChatSession;

			if (chats.has(msg.parentMessageId!)) {
				chat = chats.get(msg.parentMessageId!)!;
			} else {
				chat = model.startChat({
					history: [
						{ role: "user", parts: [{ text: "" }] },
						{ role: "model", parts: [{ text: msg.parentMessageText! }] },
					],
				});

				chats.set(msg.parentMessageId!, chat);
			}

			const { response } = await chat.sendMessage(formatPrompt(msg));
			await bot.reply(channel, response.text(), msg);
		} else {
			log.info(`Prompt (Tag) - ${yellow(user)}: ${text}`);

			const response = await generate(formatPrompt(msg));

			if (response) {
				await bot.reply(channel, response, msg);
				await redis.incr("responses_tag");
			}
		}
	}

	const subBadge = Number(msg.userInfo.badges.get("subscriber")) > 3;

	if (cronEnabled && subBadge) {
		mq.add(`${msg.userInfo.displayName}: ${text}`);
	}

	buffer.push({
		username: msg.userInfo.displayName,
		content: text,
		sentAt: new Date(),
	});

	if (buffer.length >= 100) {
		await flush();
	}
});

async function flush() {
	chats.clear();
	if (!buffer.length) return;

	const toInsert = buffer;
	buffer = [];

	try {
		await sql`
			INSERT INTO messages (
				username,
				content,
				sent_at
			) VALUES ${sql(toInsert.map((m) => [m.username, m.content, m.sentAt.toISOString()]))}
		`;
	} catch (error) {
		console.error("Error inserting messages");
		console.error(error);

		buffer = toInsert;
	}
}

new Cron("*/20 * * * *", flush, { timezone: "America/New_York" });

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
