import { yellow } from "kleur/colors";
import { model } from "../model";
import { redis } from "../redis";
import { defineCommand, handleError, log, sanitize } from "../util";

export default defineCommand({
	name: "ainerd",
	globalCooldown: 5,
	userCooldown: 5,
	async exec(content, ctx) {
		if (!content) return;

		log.info(`Prompt (Nerd) - ${yellow(ctx.userDisplayName)}: ${content}`);

		try {
			const { response } = await model.generateContent({
				contents: [
					{
						role: "user",
						parts: [{ text: `${content}` }],
					},
				],
				systemInstruction:
					"You are a Twitch chat bot designed to answer questions. Make sure to answer correctly, but add some vulgarity/profanity.",
			});

			const rawText = response.text();
			const sanitized = sanitize(rawText, { limit: 350 });

			log.info(`Response (Nerd)`);
			log(`Sanitized: ${log.inspect(sanitized)}`);
			log(` Raw text: ${log.inspect(rawText)}`);

			await ctx.reply(sanitized);
			await redis.incr("responses");
		} catch (error) {
			handleError(error);
		}
	},
});
