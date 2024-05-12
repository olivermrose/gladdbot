import fs from "node:fs/promises";
import process from "node:process";
import util from "node:util";
import { Cron } from "croner";
import { cyan, gray, red, yellow } from "kleur/colors";
import {
	GoogleGenerativeAI,
	GoogleGenerativeAIError,
	HarmBlockThreshold,
	HarmCategory,
} from "@google/generative-ai";
import { Bot, type BotCommandContext, createBotCommand } from "@twurple/easy-bot";
import emoteList from "../data/emotes.json";
import moderatorList from "../data/moderators.json";
import regularsList from "../data/regulars.json";
import { auth } from "./auth";
import { formatRatings, sanitize } from "./util";

const MAX_OUTPUT_LENGTH = 400;
const rawInstructions = await fs.readFile("./data/instructions.txt", "utf-8");

const systemInstruction = rawInstructions
	.replace("{{MODERATORS}}", moderatorList.join(", "))
	.replace("{{REGULARS}}", regularsList.join(", "))
	.replace("{{EMOTES}}", emoteList.join(", "));

if (systemInstruction.length > 8192) {
	throw new RangeError(
		red(`System instruction length exceeds 8192 characters (${systemInstruction.length}).`),
	);
}

console.log(
	`${gray("[SYSTEM]")} System instructions loaded (${yellow(systemInstruction.length)} characters)`,
);

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);
const model = ai.getGenerativeModel({
	model: "gemini-1.5-pro-latest",
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
		// {
		// 	category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		// 	threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE
		// }
	],
	generationConfig: {
		maxOutputTokens: MAX_OUTPUT_LENGTH,
	},
});

// ========== //

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands: [
		createBotCommand("ai", exec, {
			globalCooldown: 10,
			userCooldown: 20,
		}),
	],
});

bot.onConnect(() => console.log(`${gray("[SYSTEM]")} Connected to Twitch`));

const inspect = (str: string) => util.inspect(str, { colors: true });

async function exec(params: string[], { reply, userDisplayName: user }: BotCommandContext) {
	const question = params.join(" ");
	if (!question) return;

	console.log(`${cyan("[QUESTION]")} ${yellow(user)}: ${question}`);

	try {
		const { response } = await model.generateContent(`${user} asked ${question}`);

		const rawText = response.text();
		const sanitized = sanitize(rawText, { limit: MAX_OUTPUT_LENGTH, emoteList });

		if (!sanitized) {
			console.log(`${gray("[SYSTEM]")} Message failed to send.`);
			console.log(`  Raw text: ${inspect(rawText)}`);
			console.log(`   Ratings:`);
			console.log(formatRatings(response.candidates![0].safetyRatings!));
		} else {
			console.log(`${cyan("[ANSWER]")}`);
			console.log(`   Raw text: ${inspect(rawText)}`);
			console.log(`  Sanitized: ${inspect(sanitized)}`);

			await reply(sanitized);
		}
	} catch (error) {
		// TODO: handle errors better
		if (!(error instanceof GoogleGenerativeAIError)) return;

		if (error.message.includes("429")) {
			console.error(red(error.message.slice(error.message.indexOf("429") - 1)));
		} else {
			console.error(red(error.message));
		}
	}
}
