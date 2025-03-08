import process from "node:process";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import type { GenerativeModel } from "@google/generative-ai";
import type { Bot } from "@twurple/easy-bot";
import { Cron } from "croner";
import { Chat } from "./chat";
import { increment, redis, sql } from "./db";
import { MessageQueue } from "./queue";
import { handleError, log, sanitize } from "./util";
import type { ChatStart } from "./chat";
import type { ChatMessage } from "./";

interface Message {
	username: string;
	content: string;
	sentAt: Date;
}

interface SystemInstructions {
	content: string;
	replacements: Record<string, string | number>;
}

export class AI {
	public readonly model: GenerativeModel;
	public readonly chats = new Map<string, Chat>();
	public readonly context = new MessageQueue();
	public buffer: Message[] = [];

	readonly #autoSendEnabled = Number(process.env.AUTO_SEND_ENABLED);
	readonly #autoSendInterval = Number(process.env.AUTO_SEND_INTERVAL);
	readonly #cronJobs = new Set<Cron>();

	public constructor(
		public readonly bot: Bot,
		public readonly instructions: SystemInstructions,
	) {
		const genAi = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY!);

		this.model = genAi.getGenerativeModel({
			model: process.env.GOOGLE_AI_MODEL ?? "gemini-1.5-pro",
			systemInstruction: instructions.content,
			safetySettings: [
				{
					category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HARASSMENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
					threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
				},
			],
			generationConfig: {
				maxOutputTokens: 100,
				temperature: 1.5,
			},
		});

		this.#initJobs();
	}

	public startChat(start: ChatStart) {
		return new Chat(start);
	}

	public async send(channel: string, message: string) {
		return this.bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
			return ctx.chat.sendChatMessage(channel, message);
		});
	}

	// note: unused for now
	public async reply(message: ChatMessage, content: string) {
		return this.bot.api.asUser(process.env.TWITCH_USER_ID!, async (ctx) => {
			return ctx.chat.sendChatMessage(message.channelId!, content, {
				replyParentMessageId: message.id,
			});
		});
	}

	public async flush(preserveChats = false) {
		if (!preserveChats) this.chats.clear();
		if (!this.buffer.length) return;

		const toInsert = this.buffer;
		this.buffer = [];

		try {
			await sql`
					INSERT INTO messages (
						username,
						content,
						sent_at
					) VALUES ${sql(toInsert.map((m) => [m.username, m.content, m.sentAt.toISOString()]))}
				`;
		} catch (error) {
			log.error(error);
			this.buffer = toInsert;
		} finally {
			this.context.clear();
		}
	}

	#initJobs() {
		const options = { timezone: "America/New_York" };

		this.#cronJobs.add(new Cron("*/20 * * * *", this.flush.bind(this), options));

		if (this.#autoSendEnabled) {
			this.#cronJobs.add(new Cron("*/5 * * * *", this.#autoSend.bind(this), options));
		}
	}

	async #autoSend() {
		if (!this.context.messages.length) return;

		const intervals = await redis.incr("intervals");
		if (intervals < this.#autoSendInterval / 5) return;

		try {
			const { response } = await this.model.generateContent(`
			Respond to ONLY ONE of these messages without repeating what it said.
			===================
			${this.context.messages.join("\n")}
		`);

			const sanitized = sanitize(response.text(), { limit: 350 });
			const chat = this.startChat({ user: ".", bot: sanitized });

			log.info(
				{
					type: "auto",
					context: this.context.messages,
				},
				sanitized,
			);

			const next = await this.send(process.env.TWITCH_STREAMER_ID!, sanitized);
			this.chats.set(next.id, chat);

			await redis.set("intervals", 0);
			await increment("responses_auto");
		} catch (error) {
			handleError(error);
		} finally {
			this.context.clear();
		}
	}
}
