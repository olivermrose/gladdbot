import process from "node:process";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import emotes from "../data/emotes.json";
import instructions from "../data/instructions.txt";
import users from "../data/users.json";
import { formatRatings, handleError, log, sanitize } from "./util";

const systemInstruction = instructions
	.replace("{{USERS}}", users.join(", "))
	.replace("{{EMOTES}}", emotes.join(", "));

log.info(`System instructions loaded (${log.inspect(systemInstruction.length)} characters)`);

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

export const model = ai.getGenerativeModel({
	model: process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-pro-002",
	systemInstruction,
	// These filter both generated content and prompts
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
		maxOutputTokens: 100,
		temperature: 1.5,
	},
});

export async function generate(prompt: string) {
	try {
		const { response } = await model.generateContent(prompt);

		const rawText = response.text();
		const sanitized = sanitize(rawText, { limit: 350 });

		const { promptTokenCount, candidatesTokenCount } = response.usageMetadata!;

		const charCounts = `${log.inspect(sanitized.length)}/${log.inspect(rawText.length)}`;
		const tokenCounts = `${log.inspect(promptTokenCount)}/${log.inspect(candidatesTokenCount)}`;

		log.info("Response");
		log(`Sanitized: ${log.inspect(sanitized)}`);
		log(` Raw text: ${log.inspect(rawText)}`);
		log(`   Counts: C:${charCounts} | T:${tokenCounts}`);
		log(`  Ratings: ${formatRatings(response.candidates![0].safetyRatings!)}`);

		return sanitized;
	} catch (error) {
		handleError(error);
	}
}
