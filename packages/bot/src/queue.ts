interface Message {
	timestamp: number;
	content: string;
}

export class MessageQueue {
	#messages: Message[] = [];

	public get messages() {
		this.#sweep();
		return this.#messages.map((m) => m.content);
	}

	public add(message: string) {
		this.#messages.push({ timestamp: Date.now(), content: message });
		this.#sweep();
	}

	public clear() {
		this.#messages = [];
	}

	#sweep() {
		const now = Date.now();
		this.#messages = this.#messages.filter((m) => now - m.timestamp <= 3 * 60 * 1000);
	}
}
