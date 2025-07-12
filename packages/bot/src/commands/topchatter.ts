import { sql } from "../db";
import { defineCommand, log } from "../util";

export default defineCommand({
	name: "topchatter",
	aliases: ["topchatters", "top10"],
	async exec(_, ctx) {
		const today = new Date();
		const currentDay = today.getDay();

		let daysToSubtract = 0;

		if (currentDay < 5) {
			daysToSubtract = currentDay + 2;
		} else if (currentDay > 5) {
			daysToSubtract = currentDay - 5;
		}

		const lastFriday = new Date();
		lastFriday.setDate(today.getDate() - daysToSubtract);

		const weekAgo = new Date(lastFriday);
		weekAgo.setDate(lastFriday.getDate() - 7);

		log.info({ today, lastFriday, weekAgo });

		const rows = await sql<{ count: number; username: string }[]>`
			SELECT count(content), username FROM messages
			WHERE
				sent_at >= ${weekAgo.toISOString().slice(0, 10)}::date
			AND sent_at < ${lastFriday.toISOString().slice(0, 10)}::date
			GROUP BY username
			ORDER BY count(content) DESC
			LIMIT 10
		`;

		const lastFridayDate = lastFriday.toLocaleString("en-US", {
			dateStyle: "short",
			timeZone: "America/New_York",
		});

		const weekAgoDate = weekAgo.toLocaleString("en-US", {
			dateStyle: "short",
			timeZone: "America/New_York",
		});

		const top = rows.map((row, i) => `${i + 1}. ${row.username} (${row.count})`).join(" | ");

		await ctx.reply(`Top 10 chatters from ${weekAgoDate} to ${lastFridayDate}: ${top}`);
	},
});
