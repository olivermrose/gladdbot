import dayjs from "dayjs";
import timezome from "dayjs/plugin/timezone.js";
import { sql } from "../db";
import { defineCommand } from "../util";

dayjs.extend(timezome);

export default defineCommand({
	name: "topchatter",
	aliases: ["topchatters", "top10"],
	async exec(_, ctx) {
		const today = dayjs().tz("America/New_York");
		const currentDay = today.day();

		let daysToSubtract = 0;

		if (currentDay < 5) {
			daysToSubtract = currentDay + 2;
		} else if (currentDay > 5) {
			daysToSubtract = currentDay - 5;
		}

		const lastFriday = today.subtract(daysToSubtract, "day");
		const weekAgo = lastFriday.subtract(1, "week");

		const rows = await sql<{ count: number; username: string }[]>`
			SELECT count(content), username FROM messages
			WHERE
				sent_at >= ${weekAgo.toISOString().slice(0, 10)}::date
			AND sent_at < ${lastFriday.toISOString().slice(0, 10)}::date
			GROUP BY username
			ORDER BY count(content) DESC
			LIMIT 10
		`;

		const lastFridayDate = lastFriday.format("M/D/YYYY");
		const weekAgoDate = weekAgo.format("M/D/YYYY");

		const top = rows.map((row, i) => `${i + 1}. ${row.username} (${row.count})`).join(" | ");

		await ctx.reply(`Top 10 chatters from ${weekAgoDate} to ${lastFridayDate}: ${top}`);
	},
});
