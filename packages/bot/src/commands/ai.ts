import { ai } from "../";
import { increment } from "../db";
import { defineCommand, log } from "../util";

export default defineCommand({
	name: "ai",
	globalCooldown: 10,
	userCooldown: 15,
	async exec(content, ctx) {
		if (!content || !ai.enabled) return;

		log.info(
			{
				type: "command",
				user: ctx.userDisplayName,
				prompt: content,
			},
			content,
		);

		const chat = ai.startChat({ user: content });
		const response = await chat.send(ctx.msg);

		if (response) {
			await ctx.reply(response);
			await increment("responses");

			ai.chats.set(ctx.msg.id, chat);
		}
	},
});
