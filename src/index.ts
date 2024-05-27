import process from "node:process";
import Cron from "croner";
import { Bot } from "@twurple/easy-bot";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import havok from "../data/havok.json";
import ai from "./ai";
import { auth } from "./auth";
import { redis } from "./redis";
import { log } from "./util";

const bot = new Bot({
	authProvider: auth,
	channels: ["Gladd", "xiBread_"],
	commands: [ai],
});

const ws = new EventSubWsListener({ apiClient: bot.api });

bot.onConnect(() => log.info(`Connected to Twitch`));

const job = new Cron(
	"*/30 * * * *",
	async () => {
		await bot.say("Gladd", havok[(Math.random() * havok.length) | 0]);
		log.info("Cron job triggered");
	},
	{ paused: true, timezone: "America/New_York" },
);

const online = (await redis.get("online")) === "1";
if (online) job.resume();

ws.onStreamOnline(process.env.TWITCH_CHANNEL_ID!, async () => {
	job.resume();
	await redis.set("online", "1");
});

ws.onStreamOffline(process.env.TWITCH_CHANNEL_ID!, async () => {
	job.pause();
	await redis.set("online", "0");
});
