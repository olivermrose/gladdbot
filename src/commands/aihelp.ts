import { defineCommand } from "../util";

export default defineCommand({
	name: "aihelp",
	exec(_, ctx) {
		return ctx.reply(`I'm an AI Twitch bot powered by Google Gemini,
			customized to match Gladd's and his chat's behavior. Use !ai
			<prompt> to chat with me, !ainerd <prompt> to get Google-like
			responses, or !aistats to see how many prompts I've responded
			to. MrDestructoid`);
	},
});
