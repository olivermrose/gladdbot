import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import havok from "../data/havok.json";
import ai from "./ai";
import { auth } from "./auth";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands: [ai],
});

bot.onConnect(() => log.info(`Connected to Twitch`));

Cron("*/25 * * * *", async () => {
	await bot.say("Gladd", havok[(Math.random() * havok.length) | 0]);
	log.info("Cron job triggered");
});
