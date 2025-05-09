import { redis } from "../db";
import { defineCommand } from "../util";

export const nocam = defineCommand({
	name: "nocam",
	async exec(_, ctx) {
		const responses = await redis.lRange("nocam", 0, -1);
		const response = responses[Math.floor(Math.random() * responses.length)];

		await ctx.say(response);
	},
});

export const nocamadd = defineCommand({
	name: "nocamadd",
	modOnly: true,
	async exec(content, ctx) {
		if (!content) {
			await ctx.reply("Please provide a message to add.");
			return;
		}

		await redis.lPush("nocam", content);
		await ctx.reply(`Added response to the !nocam list.`);
	},
});
