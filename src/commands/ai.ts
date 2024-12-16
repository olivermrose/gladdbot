import { increment } from "../db";
import { Chat, chats, model } from "../model";
import { reply } from "../twitch";
import { defineCommand, log } from "../util";

export default defineCommand({
	name: "ai",
	globalCooldown: 15,
	userCooldown: 20,
	async exec(content, ctx) {
		if (!content) return;

		log.info({
			type: "command",
			user: ctx.userDisplayName,
			prompt: content,
		});

		const chat = new Chat({ user: content });
		const response = await chat.send(ctx.msg);

		if (response) {
			const next = await reply(ctx.msg, response);
			await increment("responses");

			chats.set(next.id, chat);
		}
	},
});
