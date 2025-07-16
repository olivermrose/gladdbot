import type { BotCommandContext } from "@twurple/easy-bot";
import { sql } from "../db";
import { emotes } from "../emotes";
import { defineCommand } from "../util";

export default defineCommand({
	name: "emoteusage",
	modOnly: true,
	userCooldown: 10,
	async exec(content, ctx) {
		const args = content.split(" ").filter(Boolean);

		// !emoteusage <emote>
		if (emotes.has(args[0])) {
			// !emoteusage <emote> <user>
			if (args[1]) {
				return usageForUser(args[0], args[1], ctx);
			}

			const data = await sql`
				SELECT username, COUNT(*) AS usage
				FROM emotes
				WHERE name = ${args[0]}
				GROUP BY username
				ORDER BY usage DESC
				LIMIT 10
			`;

			const top = data.map((emote) => `${emote.username} ${emote.usage}`).join(" | ");

			return ctx.reply(`Top 10 users for ${args[0]}: ${top}`);
		}

		// !emoteusage <user> <emote>
		if (emotes.has(args[1])) {
			return usageForUser(args[1], args[0], ctx);
		}

		const user = args[0] ?? ctx.userName;

		// !emoteusage [user]
		const data = await sql`
			SELECT name, COUNT(*) AS usage
			FROM emotes
			WHERE username ILIKE ${user.replace("@", "")}
			GROUP BY name
			ORDER BY usage DESC
			LIMIT 10
		`;

		const top = data.map((emote) => `${emote.name} ${emote.usage}`).join(" | ");

		return ctx.reply(`Top 10 emotes for ${user}: ${top}`);
	},
});

async function usageForUser(emote: string, user: string, ctx: BotCommandContext) {
	const [{ count }] = await sql`
		SELECT COUNT(*) FROM emotes
		WHERE name = ${emote} AND username ILIKE ${user.replace("@", "")}
	`;

	if (!count) {
		return ctx.reply(`${user} has not used ${emote}`);
	}

	return ctx.reply(`${user} has used ${emote} ${count} times`);
}
