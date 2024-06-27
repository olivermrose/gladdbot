import util from "node:util";
import { blue, cyan, gray, green, red, yellow } from "kleur/colors";
import { GoogleGenerativeAIError, HarmProbability, type SafetyRating } from "@google/generative-ai";
import { createBotCommand, type BotCommandContext } from "@twurple/easy-bot";
import emoteList from "../data/emotes.json";

interface Logger {
	(msg: string): void;
	info: (msg: string) => void;
	warn: (msg: string) => void;
	error: (msg: string) => void;
	inspect: (val: string | number) => string;
}

export const log: Logger = (msg) => console.log(msg);
log.info = (msg) => console.info(`${blue("[INFO]")} ${msg}`);
log.warn = (msg) => console.warn(`${yellow("[WARN]")} ${msg}`);
log.error = (msg) => console.error(`${red("[ERROR]")} ${msg}`);
log.inspect = (val) => util.inspect(val, { colors: true });

interface Command {
	name: string;
	aliases?: string[];
	globalCooldown?: number;
	userCooldown?: number;
	exec(content: string, ctx: BotCommandContext): void;
}

export function defineCommand(command: Command) {
	return createBotCommand(command.name, (args, ctx) => command.exec(args.join(" "), ctx), {
		aliases: command.aliases,
		globalCooldown: command.globalCooldown ?? 5,
		userCooldown: command.userCooldown,
	});
}

let emoteRegex: RegExp | undefined;

export function sanitize(text: string, options: { limit: number }) {
	const emotes = emoteList.map((line) => line.split(" ")[0]);
	emoteRegex ??= new RegExp(`(${emotes.join("|")})[.,!?]`, "g");

	return (
		truncate(text, options.limit, [...emotes, ".", "?", "!"])
			// insert zws at the beginning of commands
			.replace(/^([!/])/, "\u200B$1")
			.replace(/\n/g, " ")
			// remove escapes
			.replace(/\\(.)/g, "$1")
			// remove asterisks and html entities
			.replace(/\*+|&#\w+;/g, "")
			// replace emojis
			.replace(/\p{ExtPict}/gu, "")
			.replace(/gladd([A-Z0-9]+)/gi, "gladd$1")
			.replace(/g[ -]?fuel/gi, "ADVANCEDgg")
			.replace(emoteRegex, "$1")
			.trim()
	);
}

function truncate(text: string, length: number, terminators: string[]) {
	let truncated = text.slice(0, length);

	let lastTermIndex = -1;
	let lastTermLength = 0;

	for (const term of terminators) {
		const index =
			term.length === 1
				? truncated.lastIndexOf(term)
				: new RegExp(`\\b${term}\\b`).exec(truncated)?.index ?? -1;

		if (index > lastTermIndex) {
			lastTermIndex = index;
			lastTermLength = term.length;
		}
	}

	if (lastTermIndex !== -1) {
		truncated = truncated.slice(0, lastTermIndex + lastTermLength);
	}

	return truncated;
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

export function handleError(error: unknown) {
	if (!(error instanceof GoogleGenerativeAIError)) return;

	if (error.message.includes("429")) {
		log.error(error.message.slice(error.message.indexOf("429") - 1));
	} else {
		log.error(error.message);
	}
}
