import { sql } from "../db";
import { defineCommand } from "../util";

export default defineCommand({
	name: "topchatter",
	aliases: ["topchatters", "top10"],
	async exec(_, ctx) {
		const today = new Date();

		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);

		const rows = await sql<{ count: number; username: string }[]>`
			SELECT count(content), username FROM messages
			WHERE sent_at >= ${weekAgo.toISOString().slice(0, 10)}::date
			GROUP BY username
			ORDER BY count(content) DESC
			LIMIT 10
		`;

		const todayDate = today.toLocaleString("en-US", {
			dateStyle: "short",
			timeZone: "America/New_York",
		});

		const weekAgoDate = weekAgo.toLocaleString("en-US", {
			dateStyle: "short",
			timeZone: "America/New_York",
		});

		const top = rows.map((row, i) => `${i + 1}. ${row.username} (${row.count})`).join(" | ");

		await ctx.reply(`Top 10 chatters from ${weekAgoDate} to ${todayDate}: ${top}`);
	},
});
