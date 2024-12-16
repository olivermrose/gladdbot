import { redis } from "../db";
import { defineCommand } from "../util";

export default defineCommand({
	name: "aistats",
	async exec(_, ctx) {
		const responses = Number((await redis.get("responses")) ?? 0);
		const responsesMention = Number((await redis.get("responses_mention")) ?? 0);

		const total = responses + responsesMention;

		await ctx.reply(`I've responded to ${total} prompts Chatting`);
	},
});
