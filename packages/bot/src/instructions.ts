import process from "node:process";
import { redis, sql } from "./db";
import { log } from "./util";
import { bot } from ".";

export async function fetchInstructions() {
	const template = (await redis.get("instructions"))!;

	const date = new Date().toLocaleDateString("en-US", {
		dateStyle: "medium",
	});

	const result = await sql<{ username: string }[]>`
		SELECT username
		FROM messages
		GROUP BY username
		HAVING COUNT(*) > 500
		ORDER BY COUNT(*) DESC
	`;

	const users = result.map((row) => row.username);
	const emotes = await redis.lRange("emotes", 0, -1);

	let instructions = template
		.replace("{{DATE}}", date)
		.replace("{{USERS}}", users.join(", "))
		.replace("{{EMOTES}}", emotes.join(", "));

	const stream = await bot.api.streams.getStreamByUserId(process.env.TWITCH_STREAMER_ID!);

	if (stream && stream.gameName !== "Just Chatting") {
		instructions = instructions.replace(
			"{{GAME}}",
			stream.gameName === "Just Chatting" ? "nothing and is just chatting." : stream.gameName,
		);
	}

	log.info(
		{
			full: instructions,
			fullCharacters: instructions.length,
			template,
			replacements: {
				date,
				game: stream?.gameName,
				users,
				emotes,
			},
		},
		"System instructions loaded",
	);

	return instructions;
}
