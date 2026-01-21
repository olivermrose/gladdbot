import { bot } from "..";
import { increment, redis } from "../db";
import { defineCommand } from "../util";

export const roulette = defineCommand({
	name: "roulette",
	userCooldown: 180,
	async exec(_, ctx) {
		const chance = Math.random();

		if (chance < 0.005) {
			// 0.5% chance
			await ctx.timeout(600, "Roulette: 10 minute timeout");
		} else if (chance < 0.02) {
			// 1.5% chance
			await ctx.timeout(30, "Roulette: 30 second timeout");
		} else if (chance < 0.05) {
			// 3% chance
			if (await redis.get("roulette:clyde_cd")) return;

			await redis.set("roulette:clyde_cd", "1", { EX: 300 });

			await bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
				await ctx.moderation.banUser(process.env.TWITCH_STREAMER_ID!, {
					user: 114519775,
					reason: "Roulette: You got Clyded",
					duration: 300,
				});
			});

			const clydes = await increment("clydes");
			await ctx.announce(`Clyde got fucked! WAJAJA Clyde counter: ${clydes}`);

			await bot.say(
				"xClyde",
				`@xClyde You just got timed out for 5 minutes in Gladd's chat. RIPBOZO Clyde counter: ${clydes}`,
			);
		} else if (chance < 0.1) {
			// 5% chance
			await ctx.timeout(5, "Roulette: 5 second timeout");
		} else {
			// 90% chance
		}
	},
});

export const rouletteP = defineCommand({
	name: "roulette%",
	async exec(_, ctx) {
		return ctx.reply(
			"Roulette chances: 90% nothing; 5% 5s timeout; 3% Clyde 5m timeout; 1.5% 30s timeout; 0.5% 10m timeout",
		);
	},
});
