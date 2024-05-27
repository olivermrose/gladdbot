import { createBotCommand } from "@twurple/easy-bot";
import { redis } from "./redis";

export default createBotCommand(
	"aistats",
	async (_, { reply }) => {
		const responseCount = await redis.get("responses");

		await reply(`${responseCount ?? 0} questions have been answered WICKED`);
	},
	{ globalCooldown: 10 },
);
