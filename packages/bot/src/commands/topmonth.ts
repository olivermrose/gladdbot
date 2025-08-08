import dayjs from "dayjs";
import timezome from "dayjs/plugin/timezone.js";
import { sql } from "../db";
import { defineCommand } from "../util";

dayjs.extend(timezome);

export default defineCommand({
	name: "topmonth",
	async exec(_, ctx) {
		const lastMonth = dayjs().tz("America/New_York").subtract(1, "month");
		const start = lastMonth.startOf("month");
		const end = lastMonth.endOf("month");

		const rows = await sql<{ count: number; username: string }[]>`
			SELECT count(content), username FROM messages
			WHERE
				sent_at >= ${start.toISOString().slice(0, 10)}::date
			AND sent_at < ${end.toISOString().slice(0, 10)}::date
			GROUP BY username
			ORDER BY count(content) DESC
			LIMIT 10
		`;

		const startDate = start.format("M/D/YYYY");
		const endDate = end.format("M/D/YYYY");

		const top = rows.map((row, i) => `${i + 1}. ${row.username} (${row.count})`).join(" | ");

		await ctx.reply(`Top 10 chatters from ${startDate} to ${endDate}: ${top}`);
	},
});
