import { Bot } from "@twurple/easy-bot";
import { auth } from "./auth";
import commands from "./commands";
import { handleMessage } from "./events";
import { log } from "./util";

export const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info("Connected to Twitch"));

// Listen to message events on ChatClient instead of Bot
// because we need the ChatMessage object
bot.chat.onMessage(handleMessage);
