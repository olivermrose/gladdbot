import process from "node:process";
import { GoogleGenAI } from "@google/genai";
import { redis } from "../db";
import { defineCommand, handleError, log, sanitize, stripMention } from "../util";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_KEY });

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
			const response = await ai.models.generateContent({
				model: hasGrounding ? process.env.GOOGLE_AI_MODEL! : "gemini-2.0-flash",
				contents: content,
				config: {
					systemInstruction:
						"You are a Twitch chat bot designed to answer questions. Make sure to answer correctly, but add some vulgarity/profanity. Don't add any filler, just answer the question.",
					tools: [{ googleSearch: {} }],
				},
			});

			const raw = response.text ?? "";
			const sanitized = stripMention(sanitize(raw, { limit: 350 }));

			log.info(
				{
					response: {
						raw,
						sanitized,
					},
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
