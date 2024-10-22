import { redis } from "../redis";
import { defineCommand } from "../util";

export default defineCommand({
	name: "aistats",
	async exec(_, ctx) {
		const responseCount = await redis.get("responses");

		await ctx.reply(`I've responded to ${responseCount ?? 0} prompts Chatting`);
	},
});
