import process from "node:process";
import type { Bot } from "@twurple/easy-bot";
import { bot } from ".";

// Type aren't re-exported for some reason
export type ChatMessage = Parameters<Parameters<Bot["chat"]["onMessage"]>[0]>[3];

export function send(channel: string, message: string) {
	return bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
		return ctx.chat.sendChatMessage(channel, message);
	});
}

export function reply(msg: ChatMessage, message: string) {
	return bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
		return ctx.chat.sendChatMessage(msg.channelId!, message, {
			replyParentMessageId: msg.id,
		});
	});
}
