import process from "node:process";
import { DynamicRetrievalMode } from "@google/generative-ai";
import { yellow } from "kleur/colors";
import { redis } from "../db";
import { model } from "../model";
import { defineCommand, handleError, log, sanitize } from "../util";

export default defineCommand({
	name: "ainerd",
	globalCooldown: 5,
	userCooldown: 5,
	async exec(content, ctx) {
		if (!content) return;

		const hasGrounding = process.env.GOOGLE_AI_MODEL === "gemini-1.5-pro";

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
				tools: hasGrounding
					? [
							{
								googleSearchRetrieval: {
									dynamicRetrievalConfig: {
										mode: DynamicRetrievalMode.MODE_DYNAMIC,
										dynamicThreshold: 0.5,
									},
								},
							},
						]
					: undefined,
			});

			const rawText = response.text();
			const sanitized = sanitize(rawText, { limit: 350 });

			const grounded = !!response.candidates?.[0].groundingMetadata;

			log.info(`Response (Nerd${grounded ? ", Grounded" : ""})`);
			log(`Sanitized: ${log.inspect(sanitized)}`);
			log(` Raw text: ${log.inspect(rawText)}`);

			await ctx.reply(sanitized);
			await redis.incr("responses");
		} catch (error) {
			handleError(error);
		}
	},
});
