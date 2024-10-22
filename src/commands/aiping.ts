import { defineCommand } from "../util";

// Only useful to do a quick check if the bot's alive and not use an api request
export default defineCommand({
	name: "aiping",
	exec(_, ctx) {
		return ctx.reply("fuck u lol buhOverShakeyFlipExplode");
	},
});
