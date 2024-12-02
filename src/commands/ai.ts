import { yellow } from "kleur/colors";
import { redis } from "../db";
import { generate } from "../model";
import { defineCommand, formatPrompt, log } from "../util";

export default defineCommand({
	name: "ai",
	globalCooldown: 15,
	userCooldown: 20,
	async exec(content, ctx) {
		if (!content) return;

		log.info(`Prompt - ${yellow(ctx.userDisplayName)}: ${content}`);

		const response = await generate(formatPrompt(ctx.msg));
		if (!response) return;

		await ctx.reply(response);
		await redis.incr("responses");
	},
});
