import process from "node:process";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

import { redis } from "./db";
import { log } from "./util";

const instructions = (await redis.get("instructions"))!;

const users = await redis.lRange("users", 0, -1);
const emotes = await redis.lRange("emotes", 0, -1);

const systemInstruction = instructions
	.replace("{{USERS}}", users.join(", "))
	.replace("{{EMOTES}}", emotes.join(", "));

log.info(`System instructions loaded (${systemInstruction.length} characters)`);

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

export const model = ai.getGenerativeModel({
	model: process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-pro",
	systemInstruction,
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

export * from "./chat";
