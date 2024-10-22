import process from "node:process";
import { RefreshingAuthProvider } from "@twurple/auth";
import postgres from "postgres";
import { log } from "./util";

export const sql = postgres(process.env.POSTGRES_URL!);

interface TokenData {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	obtainment_timestamp: number;
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
		await sql`
			INSERT INTO tokens (
				access_token,
				refresh_token,
				expires_in,
				obtainment_timestamp
			) VALUES (
				${data.accessToken},
				${data.refreshToken},
				${data.expiresIn},
				${data.obtainmentTimestamp}
			);
		`;

		log.info("Auth refreshed");
	} catch {
		log.error("Error refreshing auth");
	}
});

auth.addUser(
	process.env.TWITCH_USER_ID!,
	{
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in,
		obtainmentTimestamp: data.obtainment_timestamp,
		scope: ["chat:edit", "chat:read"],
	},
	["chat"],
);
