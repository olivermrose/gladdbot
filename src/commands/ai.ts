import { yellow } from "kleur/colors";
import { defineCommand, formatRatings, handleError, log, sanitize } from "../util";
import { model } from "../model";
import { redis } from "../redis";

export default defineCommand({
	name: "ai",
	globalCooldown: 15,
	userCooldown: 20,
	async exec(content, ctx) {
		if (!content) return;

		log.info(`Prompt - ${yellow(ctx.userDisplayName)}: ${content}`);

		try {
			const { response } = await model.generateContent(`${ctx.userDisplayName}: ${content}`);

			const rawText = response.text();
			const sanitized = sanitize(rawText, { limit: 350 });

			const { totalTokens } = await model.countTokens(rawText);

			log.info(`Response`);
			log(`  Sanitized: ${log.inspect(sanitized)}`);
			log(`   Raw text: ${log.inspect(rawText)}`);
			log(`Token count: ${log.inspect(totalTokens)}`);
			log(`Char. count: ${log.inspect(rawText.length)}/${log.inspect(sanitized.length)}`);
			log(`    Ratings:`);
			log(formatRatings(response.candidates![0].safetyRatings!));

			await ctx.reply(sanitized);
			await redis.incr("responses");
		} catch (error) {
			handleError(error);
		}
	},
});
