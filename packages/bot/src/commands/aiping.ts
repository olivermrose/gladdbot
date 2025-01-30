import { defineCommand } from "../util";

// Only useful to do a quick check if the bot's alive and not use an api request
export default defineCommand({
	name: "aiping",
	async exec(_, ctx) {
		await ctx.reply("fuck u lol buhOverShakeyFlipExplode");
	},
});
