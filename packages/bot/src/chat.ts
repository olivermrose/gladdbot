import type { Chat as AiChat } from "@google/genai";
import { formatPrompt, formatRatings, handleError, log, sanitize, stripMention } from "./util";
import type { ChatMessage } from "./";

export interface ChatStart {
	user: string;
	bot?: string;
}

export class Chat {
	public constructor(private readonly session: AiChat) {}

	public getHistory() {
		return this.session.getHistory();
	}

	public async send(msg: ChatMessage): Promise<string | undefined> {
		try {
			const response = await this.session.sendMessage({
				message: formatPrompt(msg),
			});

			const raw = response.text ?? "";
			const sanitized = stripMention(sanitize(raw, { limit: 350 }));

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
