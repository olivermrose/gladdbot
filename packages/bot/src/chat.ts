import type { ChatSession, Content } from "@google/generative-ai";
import { formatPrompt, formatRatings, handleError, log, sanitize } from "./util";
import { ai } from "./";
import type { ChatMessage } from "./";

export interface ChatStart {
	user: string;
	bot?: string;
}

export class Chat {
	readonly #session: ChatSession;
	readonly #history: Content[] = [];

	public constructor(start: ChatStart) {
		this.#history.push({
			role: "user",
			parts: [{ text: start.user }],
		});

		if (start.bot) {
			this.#history.push({
				role: "model",
				parts: [{ text: start.bot }],
			});
		}

		this.#session = ai.model.startChat({ history: this.#history });
	}

	public getHistory() {
		return this.#session.getHistory();
	}

	public async send(msg: ChatMessage): Promise<string | undefined> {
		try {
			const { response } = await this.#session.sendMessage(formatPrompt(msg));

			const raw = response.text();
			const sanitized = sanitize(raw, { limit: 350 });

			const { promptTokenCount, candidatesTokenCount } = response.usageMetadata!;

			log.info(
				{
					response: {
						raw,
						sanitized,
					},
					counts: {
						characters: [sanitized.length, raw.length],
						tokens: [promptTokenCount, candidatesTokenCount],
					},
					ratings: formatRatings(response.candidates?.[0].safetyRatings ?? []),
				},
				sanitized,
			);

			return sanitized;
		} catch (error) {
			handleError(error);
		}
	}
}
