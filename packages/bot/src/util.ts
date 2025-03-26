import pino from "pino";
import { createBotCommand, type BotCommandContext } from "@twurple/easy-bot";
import { redis } from "./db";
import type { ChatMessage } from "./";
import type { SafetyRating } from "@google/genai";

export const log = pino({ base: null });

interface Command {
	name: string;
	aliases?: string[];
	globalCooldown?: number;
	userCooldown?: number;
	modOnly?: boolean;
	exec(content: string, ctx: BotCommandContext): void;
}

export function defineCommand(command: Command) {
	return createBotCommand(
		command.name,
		(args, ctx) => {
			if (command.modOnly && !ctx.msg.userInfo.isBroadcaster && !ctx.msg.userInfo.isMod)
				return;

			command.exec(args.join(" "), ctx);
		},
		{
			aliases: command.aliases,
			globalCooldown: command.globalCooldown ?? 5,
			userCooldown: command.userCooldown,
		},
	);
}

export function formatPrompt(message: ChatMessage) {
	let user = message.userInfo.displayName;
	const badges: string[] = [];

	if (message.userInfo.isMod) badges.push("Mod");
	if (message.userInfo.isVip) badges.push("VIP");

	if (badges.length) {
		user += ` (${badges.join(", ")})`;
	}

	return `${user} sent the following prompt\n<PROMPT>${message.text}</PROMPT>`;
}

const emoteList = await redis.lRange("emotes", 0, -1);
let emoteRegex: RegExp | undefined;

export function sanitize(text: string, options: { limit: number }) {
	const emotes = emoteList.map((line) => line.split(" ")[0]);
	emoteRegex ??= new RegExp(`(${emotes.join("|")})[.,!?]`, "g");

	return (
		truncate(text, options.limit, [...emotes, ".", "?", "!"])
			// insert reserved unicode tag at the beginning of commands
			.replace(/^([!/])/, "\u{E0000}$1")
			.replace(/\n/g, " ")
			// remove escapes
			.replace(/\\(.)/g, "$1")
			// remove asterisks and html entities
			.replace(/\*+|&#\w+;/g, "")
			// replace emojis
			.replace(/\p{ExtPict}/gu, "")
			// this was causing false positives
			// .replace(/g[ -]?fuel/gi, "ADVANCEDgg")
			.replace(emoteRegex, "$1")
			.trim()
	);
}

function truncate(text: string, length: number, terminators: string[]) {
	if (text.length <= length) return text;
	let truncated = text.slice(0, length);

	let lastTermIndex = -1;
	let lastTermLength = 0;

	for (const term of terminators) {
		const index =
			term.length === 1
				? truncated.lastIndexOf(term)
				: (new RegExp(`\\b${term}\\b`).exec(truncated)?.index ?? -1);

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

export function formatRatings(ratings: SafetyRating[]) {
	return ratings.reduce<Record<string, string>>(
		(acc, rating) => ({ ...acc, [rating.category!]: rating.probability! }),
		{},
	);
}

export function handleError(error: unknown) {
	log.error(error);
}
