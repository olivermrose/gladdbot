import { ai } from "../";
import { increment } from "../db";
import { trackEmotes } from "../emotes";
import { log } from "../util";
import type { ChatMessage } from "../";
import type { Chat } from "../chat";

const BOT_USERNAMES = ["blerp", "fossabot", "gladdbotai", "nightbot"];

export async function handleMessage(channel: string, user: string, text: string, msg: ChatMessage) {
	if (isEmoteSpam(msg)) {
		const { text } = await ai.generate(
			`Tell ${user} to stop spamming emotes and shut the fuck up; be super rude.`,
			"gemini-2.0-flash",
		);

		await ai.bot.say(channel, text!);
	}

	if (BOT_USERNAMES.includes(user) || text.startsWith("!")) return;

	await trackEmotes(text.split(" "), user);

	// Chat logic
	if (/@?gladdbot(?:ai)?/i.test(text)) {
		if (msg.isReply) {
			let chat: Chat;

			if (ai.chats.has(msg.threadMessageId!)) {
				chat = ai.chats.get(msg.threadMessageId!)!;
			} else {
				chat = ai.startChat({
					// todo: track original message
					user: ".",
					bot: msg.parentMessageText!,
				});
			}

			const response = await chat.send(msg);
			if (!response) return;

			await ai.bot.reply(channel, response, msg);
			await increment("responses");
		} else {
			log.info(
				{
					type: "mention",
					user,
					prompt: text,
				},
				text,
			);

			const chat = ai.startChat({ user: text });

			const response = await chat.send(msg);
			if (!response) return;

			await ai.bot.reply(channel, response, msg);
			await increment("responses_mention");

			ai.chats.set(msg.id, chat);
		}
	}

	const monthsSubbed = Number(msg.userInfo.badgeInfo.get("subscriber") ?? 0);

	if (monthsSubbed >= 3) {
		ai.context.add(`${msg.userInfo.displayName}: ${text}`);
	}

	ai.buffer.push({
		username: msg.userInfo.displayName,
		content: text,
		sentAt: new Date(),
	});

	if (ai.buffer.length >= 100) {
		await ai.flush(true);
	}
}

const userMessages = new Map<string, string[]>();

function getRepeat(text: string) {
	const words = text.trim().replace("\u{E0000}", "").split(/\s+/);
	if (words.length === 0) return null;

	if (words.every((w) => w === words[0])) {
		return words[0];
	}

	return null;
}

function isEmoteSpam(msg: ChatMessage): boolean {
	const repeat = getRepeat(msg.text);
	if (!repeat) return false;

	if (!userMessages.has(msg.userInfo.userId)) {
		userMessages.set(msg.userInfo.userId, []);
	}

	const messages = userMessages.get(msg.userInfo.userId)!;
	messages.push(repeat);

	if (messages.length > 3) {
		messages.shift();
	}

	for (const id of userMessages.keys()) {
		if (id !== msg.userInfo.userId) {
			userMessages.set(id, []);
		}
	}

	return messages.length === 3 && messages.every((m) => m === repeat);
}
