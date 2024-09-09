import process from "node:process";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import emotes from "../data/emotes.json";
import users from "../data/users.json";
import instructions from "../data/instructions.txt";
import { log } from "./util";

const systemInstruction = instructions
	.replace("{{USERS}}", users.join(", "))
	.replace("{{EMOTES}}", emotes.join(", "));

log.info(`System instructions loaded (${log.inspect(systemInstruction.length)} characters)`);

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

export const model = ai.getGenerativeModel({
	model: process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-pro-001",
	systemInstruction,
	// These filter Gemini's response, not the user's messages
	safetySettings: [
		{
			category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
			threshold: HarmBlockThreshold.BLOCK_NONE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
			threshold: HarmBlockThreshold.BLOCK_NONE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_HARASSMENT,
			threshold: HarmBlockThreshold.BLOCK_NONE,
		},
		{
			category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
			threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
		},
	],
	generationConfig: {
		/**
		 * Tokens do not directly correspond to characters/words. I've found that
		 * 90-100 tokens is around 500 characters; however, it fails to generate
		 * anything if it's prompted with anything that would go over the limit
		 * e.g. "tell me a bedtime story about dragons," so this option is
		 * essentially useless for now.
		 */
		// maxOutputTokens: 100,
		temperature: 1.5,
	},
});
