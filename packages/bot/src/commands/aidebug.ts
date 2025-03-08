import { ai } from "..";
import { defineCommand } from "../util";

export default defineCommand({
	name: "aidebug",
	modOnly: true,
	async exec(content, ctx) {
		const args = content.split(" ");

		switch (args[0]) {
			case "replacements": {
				const parts: string[] = [];

				for (const [key, value] of Object.entries(ai.instructions.replacements)) {
					parts.push(`${key}: ${value}`);
				}

				await ctx.reply(parts.join(" | "));
				break;
			}
		}
	},
});
