import { sql } from "./db";

export const emotes = new Set<string>();

export async function fetchEmotes() {
	const response = await fetch("https://7tv.io/v4/gql", {
		method: "post",
		body: JSON.stringify({
			query: `
query {
  emoteSets {
    emoteSet(id: "01G1YC2QH80003SZSY7SHK2EDE") {
	    emotes {
        items {
          emote {
            defaultName
          }
        }
      }
  	}
  }
}
		`,
		}),
	});

	const { data } = await response.json();
	const { items } = data.emoteSets.emoteSet.emotes;

	for (const { emote } of items) {
		emotes.add(emote.defaultName);
	}
}

export async function trackEmotes(parts: string[], id: string, username: string) {
	const found: string[] = [];

	for (const part of parts) {
		if (emotes.has(part)) found.push(part);
	}

	if (found.length) {
		await sql`
			INSERT INTO emotes (name, user_id, username)
			VALUES ${sql(found.map((name) => [name, id, username]))}
		`;
	}
}
