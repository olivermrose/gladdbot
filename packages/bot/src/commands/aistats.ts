import { redis } from "../db";
import { defineCommand } from "../util";

const get = async (key: string) => Number((await redis.get(key)) ?? 0);

export default defineCommand({
	name: "aistats",
	async exec(_, ctx) {
		const responses = await get("responses");
		const responsesMention = await get("responses_mention");
		const responsesAuto = await get("responses_auto");

		await ctx.reply(
			`I've responded to ${responses + responsesMention} prompts and sent ${responsesAuto} messages on my own Chatting`,
		);
	},
});
