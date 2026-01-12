import { bot } from "..";
import { increment } from "../db";
import { defineCommand } from "../util";

export default defineCommand({
	name: "roulette",
	userCooldown: 60,
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
			await ctx.timeout(5, "Roulette: 5 second timeout");
		} else if (chance < 0.1) {
			// 5% chance
			await bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
				await ctx.moderation.banUser(process.env.TWITCH_STREAMER_ID!, {
					user: 114519775,
					reason: "Roulette: You got Clyded",
					duration: 300,
				});
			});

			const clydes = await increment("clydes");
			await ctx.announce(`Clyde got fucked! WAJAJA Clyde counter: ${clydes}`);
		} else {
			// 90% chance
		}
	},
});
