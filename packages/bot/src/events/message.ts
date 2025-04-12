import { ai } from "../";
import { increment } from "../db";
import { trackEmotes } from "../emotes";
import { log } from "../util";
import type { ChatMessage } from "../";
import type { Chat } from "../chat";

const BOT_USERNAMES = ["blerp", "fossabot", "gladdbotai", "nightbot"];

export async function handleMessage(channel: string, user: string, text: string, msg: ChatMessage) {
	if (BOT_USERNAMES.includes(user) || text.startsWith("!")) return;

	await trackEmotes(text.split(" "), user);

	if (hasTriangle(text)) {
		const { text } = await ai.generate(
			`Tell ${user} to stop spamming emotes and shut up.`,
			"gemini-2.0-flash",
		);

		await ai.bot.say(channel, text!);
	}

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

let lastMessage: string | null = null;
let currentLevel = 0;
let direction: "up" | "down" = "up";
let interrupted = false;

function hasTriangle(text: string): boolean {
	const words = text.trim().replace("\u{E0000}", "").split(/\s+/);
	const unique = new Set(words);

	if (unique.size !== 1) {
		reset();
		return false;
	}

	const word = words[0];
	const count = words.length;

	if (lastMessage === null || word !== lastMessage) {
		lastMessage = word;
		currentLevel = count;
		direction = "up";
		interrupted = false;

		return false;
	}

	if (interrupted) return true;

	if (direction === "up") {
		if (count === currentLevel + 1) {
			currentLevel++;

			if (currentLevel === 3) {
				interrupted = true;
				reset();
				return true;
			}
		} else if (count === currentLevel - 1) {
			direction = "down";
			currentLevel--;
		} else {
			reset();
		}
	} else {
		if (count === currentLevel - 1) {
			currentLevel--;
			if (currentLevel === 0) reset();
		} else {
			reset();
		}
	}

	return false;
}

function reset() {
	lastMessage = null;
	currentLevel = 0;
	direction = "up";
	interrupted = false;
}
