import process from "node:process";
import { Cron } from "croner";
import { bot } from "..";
import { increment, redis, sql } from "../db";
import { Chat, chats, model } from "../model";
import { MessageQueue } from "../queue";
import { type ChatMessage, reply, send } from "../twitch";
import { handleError, log, sanitize } from "../util";

interface Message {
	username: string;
	content: string;
	sentAt: Date;
}

const BOT_USERNAMES = ["blerp", "fossabot", "gladdbotai", "nightbot"];

const autoSendEnabled = Number(process.env.AUTO_SEND_ENABLED);
const autoSendInterval = Number(process.env.AUTO_SEND_INTERVAL);

const context = new MessageQueue();
let buffer: Message[] = [];

export async function handleMessage(channel: string, user: string, text: string, msg: ChatMessage) {
	if (BOT_USERNAMES.includes(user) || text.startsWith("!")) return;

	// Chat logic
	if (/@?gladdbot(?:ai)?/i.test(text)) {
		if (msg.isReply) {
			let chat: Chat;

			if (chats.has(msg.parentMessageId!)) {
				chat = chats.get(msg.parentMessageId!)!;
			} else {
				chat = new Chat({
					// todo: track original message
					user: ".",
					model: msg.parentMessageText!,
				});
			}

			const response = await chat.send(msg);
			if (!response) return;

			const next = await reply(msg, response);
			await increment("responses");

			chats.delete(msg.parentMessageId!);
			chats.set(next.id, chat);
		} else {
			if (/\bgladdbot\b/i.test(text) && Math.random() > 0.35) {
				return;
			}

			log.info(
				{
					type: "mention",
					user,
					prompt: text,
				},
				text,
			);

			const chat = new Chat({ user: text });

			const response = await chat.send(msg);
			if (!response) return;

			const next = await reply(msg, response);
			await increment("responses_mention");

			chats.set(next.id, chat);
		}
	}

	const monthsSubbed = Number(msg.userInfo.badgeInfo.get("subscriber") ?? 0);

	if (autoSendEnabled && monthsSubbed >= 3) {
		context.add(`${msg.userInfo.displayName}: ${text}`);
	}

	buffer.push({
		username: msg.userInfo.displayName,
		content: text,
		sentAt: new Date(),
	});

	if (buffer.length >= 100) {
		await flush(true);
	}
}

async function autoSend() {
	if (!context.messages.length) return;

	const stream = await bot.api.streams.getStreamByUserName("Gladd");
	if (!stream) return;

	const intervals = await redis.incr("intervals");
	if (intervals < autoSendInterval / 5) return;

	try {
		const { response } = await model.generateContent(`
			Respond to ONLY ONE of these messages without repeating what it said.
			===================
			${context.messages.join("\n")}
		`);

		const sanitized = sanitize(response.text(), { limit: 350 });
		const chat = new Chat({ user: ".", model: sanitized });

		log.info(
			{
				type: "auto",
				context: context.messages,
			},
			sanitized,
		);

		const next = await send(stream.userId, sanitized);
		chats.set(next.id, chat);

		await redis.set("intervals", 0);
		await increment("responses_auto");
	} catch (error) {
		handleError(error);
	} finally {
		context.clear();
	}
}

async function flush(preserveChats = false) {
	if (!preserveChats) chats.clear();
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
		log.error(error);
		buffer = toInsert;
	}
}

new Cron("*/20 * * * *", flush, { timezone: "America/New_York" });

if (autoSendEnabled) {
	new Cron("*/5 * * * *", autoSend, { timezone: "America/New_York" });
}
