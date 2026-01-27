import process from "node:process";
import { RefreshingAuthProvider } from "@twurple/auth";
import { sql } from "./db";
import { log } from "./util";

interface TokenData {
	access_token: string;
	refresh_token: string;
	expires_at: Date;
	created_at: Date;
}

const [data] = await sql<[TokenData]>`
	SELECT * FROM tokens
	ORDER BY id DESC LIMIT 1
`;

export const auth = new RefreshingAuthProvider({
	clientId: process.env.TWITCH_CLIENT_ID!,
	clientSecret: process.env.TWITCH_CLIENT_SECRET!,
});

auth.onRefresh(async (_, data) => {
	try {
		const expiresAt = data.expiresIn
			? new Date(data.obtainmentTimestamp + data.expiresIn * 1000)
			: null;

		await sql`
			INSERT INTO tokens (
				access_token,
				refresh_token,
				created_at,
				expires_at,
			) VALUES (
				${data.accessToken},
				${data.refreshToken},
				${new Date(data.obtainmentTimestamp)},
				${expiresAt}
			);
		`;

		log.info("Auth refreshed");
	} catch (error) {
		if (error instanceof Error) {
			log.error(error, "Error refreshing auth");
		}
	}
});

auth.addUser(
	process.env.TWITCH_USER_ID!,
	{
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: Math.floor((data.expires_at.getTime() - data.created_at.getTime()) / 1000),
		obtainmentTimestamp: data.created_at.getTime(),
		scope: [
			"chat:edit",
			"chat:read",
			"channel:bot",
			"channel:moderate",
			"user:bot",
			"user:read:chat",
			"user:write:chat",
			"moderator:manage:announcements",
			"moderator:manage:banned_users",
			"moderator:manage:chat_messages",
			"moderator:manage:shoutouts",
			"moderator:manage:warnings",
		],
	},
	["chat"],
);
