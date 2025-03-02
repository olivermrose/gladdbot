import { redis } from "./db";
import { log } from "./util";

export async function fetchInstructions() {
	const template = (await redis.get("instructions"))!;

	const date = new Date().toLocaleDateString("en-US", {
		dateStyle: "medium",
	});

	const users = await redis.lRange("users", 0, -1);
	const emotes = await redis.lRange("emotes", 0, -1);

	const instructions = template
		.replace("{{DATE}}", date)
		.replace("{{USERS}}", users.join(", "))
		.replace("{{EMOTES}}", emotes.join(", "));

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
