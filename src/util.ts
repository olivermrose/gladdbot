import { cyan, gray, green, red, yellow } from "kleur/colors";
import { HarmProbability, type SafetyRating } from "@google/generative-ai";

let emoteRegex: RegExp | undefined;

export function sanitize(text: string, options: { limit: number; emoteList: string[] }) {
	emoteRegex ??= new RegExp(
		`(${options.emoteList.map((line) => line.split(" ")[0]).join("|")})[.,!?]`,
		"g",
	);

	return (
		text
			/**
			 * Yes, naively slicing will possibly cut off text mid-sentence; however,
			 * there's no good method to detect the end of a sentence when using 7TV
			 * emotes.
			 */
			.slice(0, options.limit)
			// insert zws at the beginning of commands
			.replace(/^([!/])/, "\u200B$1")
			// newlines to spaces
			.replace(/\n/g, " ")
			// remove escapes
			.replace(/\\(.)/g, "$1")
			// remove asterisks, html entities, and emojis
			.replace(/\*+|&#\w+?;|\p{ExtPict}/gu, "")
			.replace(/gfuel/gi, "ADVANCEDgg")
			.replace(emoteRegex, "$1")
			.trim()
	);
}

const probabilityColors = {
	[HarmProbability.HARM_PROBABILITY_UNSPECIFIED]: gray,
	[HarmProbability.NEGLIGIBLE]: cyan,
	[HarmProbability.LOW]: green,
	[HarmProbability.MEDIUM]: yellow,
	[HarmProbability.HIGH]: red,
};

export function formatRatings(ratings: SafetyRating[]) {
	function getProbability(keyword: string) {
		const { probability: p } = ratings.find((r) => r.category.includes(keyword))!;
		return probabilityColors[p](p);
	}

	return [
		`\t- Dangerous content: ${getProbability("DANGER")}`,
		`\t- Harassment: ${getProbability("HARASS")}`,
		`\t- Hate speech: ${getProbability("HATE")}`,
		`\t- Sexually explicit: ${getProbability("SEXUAL")}`,
	].join("\n");
}
