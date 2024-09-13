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
