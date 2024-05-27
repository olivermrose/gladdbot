import process from "node:process";
import fs from "node:fs/promises";
import { yellow } from "kleur/colors";
import {
	GoogleGenerativeAI,
	GoogleGenerativeAIError,
	HarmBlockThreshold,
	HarmCategory,
} from "@google/generative-ai";
import { createBotCommand } from "@twurple/easy-bot";
import emoteList from "../data/emotes.json";
import moderatorList from "../data/moderators.json";
import regularsList from "../data/regulars.json";
import { redis } from "./redis";
import { formatRatings, log, sanitize } from "./util";

const rawInstructions = await fs.readFile("./data/instructions.txt", "utf-8");

const systemInstruction = rawInstructions
	.replace("{{MODERATORS}}", moderatorList.join(", "))
	.replace("{{REGULARS}}", regularsList.join(", "))
	.replace("{{EMOTES}}", emoteList.join(", "));

if (systemInstruction.length > 8192) {
	log.warn(
		`System instructions exceed 8192 characters (${log.inspect(systemInstruction.length)}). This can potentially generate lower quality responses.`,
	);
}

log.info(`System instructions loaded (${log.inspect(systemInstruction.length)} characters)`);

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
	},
});

export default createBotCommand(
	"ai",
	async (params, { reply, userDisplayName: user }) => {
		const prompt = params.join(" ");
		if (!prompt) return;

		log.info(`Prompt - ${yellow(user)}: ${prompt}`);

		try {
			const { response } = await model.generateContent(`${user} prompted ${prompt}`);

			const rawText = response.text();
			const sanitized = sanitize(rawText, { limit: 350, emoteList });

			const { totalTokens } = await model.countTokens(rawText);

			log.info(`Response`);
			log(`  Sanitized: ${log.inspect(sanitized)}`);
			log(`   Raw text: ${log.inspect(rawText)}`);
			log(`Token count: ${log.inspect(totalTokens)}`);
			log(`Char. count: ${log.inspect(rawText.length)}/${log.inspect(sanitized.length)}`);
			log(`    Ratings:`);
			log(formatRatings(response.candidates![0].safetyRatings!));

			await reply(sanitized);

			if ((await redis.get("online")) === "1") {
				await redis.incr("responses");
			}
		} catch (error) {
			// TODO: handle errors better
			if (!(error instanceof GoogleGenerativeAIError)) return;

			if (error.message.includes("429")) {
				log.error(error.message.slice(error.message.indexOf("429") - 1));
			} else {
				log.error(error.message);
			}
		}
	},
	{
		globalCooldown: 15,
		userCooldown: 20,
	},
);
