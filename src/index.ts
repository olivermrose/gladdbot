import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import commands from "./commands";
import { auth } from "./auth";
import { job } from "./cron";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands,
});

bot.onConnect(() => log.info(`Connected to Twitch`));

Cron(`*/5 * * * *`, async () => await job(bot), { timezone: "America/New_York" });
