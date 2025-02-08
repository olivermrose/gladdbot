import process from "node:process";
import { DynamicRetrievalMode } from "@google/generative-ai";
import { redis } from "../db";
import { model } from "../model";
import { defineCommand, handleError, log, sanitize } from "../util";

export default defineCommand({
	name: "ainerd",
	globalCooldown: 5,
	userCooldown: 5,
	async exec(content, ctx) {
		if (!content) return;

		const hasGrounding = !process.env.GOOGLE_AI_MODEL?.includes("exp");

		log.info(
			{
				type: "command",
				user: ctx.userDisplayName,
				prompt: content,
			},
			content,
		);

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

			log.info(
				{
					response: {
						raw: rawText,
						sanitized,
					},
					grounded,
				},
				sanitized,
			);

			await ctx.reply(sanitized);
			await redis.incr("responses");
		} catch (error) {
			handleError(error);
		}
	},
});
