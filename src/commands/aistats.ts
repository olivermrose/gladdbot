import { redis } from "../db";
import { defineCommand } from "../util";

export default defineCommand({
	name: "aistats",
	async exec(_, ctx) {
		const responses = Number(await redis.get("responses") ?? 0);
		const responsesTags = Number(await redis.get("responses_tag") ?? 0);

		const total = responses + responsesTags

		await ctx.reply(`I've responded to ${total} prompts Chatting`);
	},
});
