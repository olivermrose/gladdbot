import { Bot } from "@twurple/easy-bot";
import { AI } from "./ai";
import { auth } from "./auth";
import commands from "./commands";
import { fetchEmotes } from "./emotes";
import { handleMessage } from "./events";
import { fetchInstructions } from "./instructions";
import { log } from "./util";
import { redis } from "./db";

await fetchEmotes();

// Type aren't re-exported for some reason
export type ChatMessage = Parameters<Parameters<Bot["chat"]["onMessage"]>[0]>[3];

export const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info("Connected to Twitch"));

// Listen to message events on ChatClient instead of Bot
// because we need the ChatMessage object
bot.chat.onMessage(handleMessage);

const instructions = (await redis.get("instructions"))!;

export const ai = new AI(bot, instructions);
