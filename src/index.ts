import fs from "node:fs/promises";
import process from "node:process";
import util from "node:util";
import { blue, red, yellow } from "kleur/colors";
import Cron from "croner";
import {
	GoogleGenerativeAI,
	GoogleGenerativeAIError,
	HarmBlockThreshold,
	HarmCategory,
} from "@google/generative-ai";
import { Bot, type BotCommandContext, createBotCommand } from "@twurple/easy-bot";
import havok from "../data/havok.json";
import emoteList from "../data/emotes.json";
import moderatorList from "../data/moderators.json";
import regularsList from "../data/regulars.json";
import { auth } from "./auth";
import { formatRatings, sanitize } from "./util";

const rawInstructions = await fs.readFile("./data/instructions.txt", "utf-8");

const systemInstruction = rawInstructions
	.replace("{{MODERATORS}}", moderatorList.join(", "))
	.replace("{{REGULARS}}", regularsList.join(", "))
	.replace("{{EMOTES}}", emoteList.join(", "));

if (systemInstruction.length > 8192) {
	console.warn(
		`${yellow("[WARN]")} System instructions exceed 8192 characters (${systemInstruction.length}). This can potentially generate lower quality responses.`,
	);
}

console.log(
	`${blue("[INFO]")} System instructions loaded (${yellow(systemInstruction.length)} characters)`,
);

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);
const model = ai.getGenerativeModel({
	model: "gemini-1.5-flash-latest",
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
		/**
		 * Tokens do not directly correspond to characters/words. I've found that
		 * 90-100 tokens is around 500 characters; however, it fails to generate
		 * anything if it's prompted with anything that would go over the limit
		 * e.g. "tell me a bedtime story about dragons," so this option is
		 * essentially useless for now.
		 */
		// maxOutputTokens: 100,
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

bot.onConnect(() => console.log(`${blue("[INFO]")} Connected to Twitch`));

Cron("*/30 * * * *", async () => {
	await bot.say("Gladd", havok[(Math.random() * havok.length) | 0]);
});

const inspect = (value: string | number) => util.inspect(value, { colors: true });

async function exec(params: string[], { reply, userDisplayName: user }: BotCommandContext) {
	const prompt = params.join(" ");
	if (!prompt) return;

	console.log(`${blue("[INFO]")} Prompt - ${yellow(user)}: ${prompt}`);

	try {
		const { response } = await model.generateContent(`${user} prompted ${prompt}`);

		const rawText = response.text();
		const sanitized = sanitize(rawText, { limit: 350, emoteList });

		const { totalTokens } = await model.countTokens(rawText);

		console.log(`${blue("[INFO]")} Response`);
		console.log(`  Sanitized: ${inspect(sanitized)}`);
		console.log(`   Raw text: ${inspect(rawText)}`);
		console.log(`Token count: ${inspect(totalTokens)}`);
		console.log(`Char. count: ${inspect(rawText.length)}/${inspect(sanitized.length)}`);
		console.log(`    Ratings:`);
		console.log(formatRatings(response.candidates![0].safetyRatings!));

		await reply(sanitized);
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
