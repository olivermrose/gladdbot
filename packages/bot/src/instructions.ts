import process from "node:process";
import { redis } from "./db";
import { log } from "./util";
import { bot } from ".";

export async function fetchInstructions() {
	const template = (await redis.get("instructions"))!;

	const date = new Date().toLocaleDateString("en-US", {
		dateStyle: "medium",
	});

	const users = await redis.lRange("users", 0, -1);
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
				users,
				emotes,
			},
		},
		"System instructions loaded",
	);

	return instructions;
}
