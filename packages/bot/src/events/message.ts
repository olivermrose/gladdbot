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
