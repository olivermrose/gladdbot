import { redis } from "../redis";
import { defineCommand } from "../util";

export default defineCommand({
	name: "aistats",
	async exec(_, ctx) {
		const responseCount = await redis.get("responses");

		await ctx.reply(`${responseCount ?? 0} questions have been answered WICKED`);
	},
});
