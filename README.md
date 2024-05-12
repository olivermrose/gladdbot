# GladdBot

Curated Twitch chatbot for [Gladd](https://twitch.tv/gladd) using [Gemini](https://gemini.google.com/app). Feel free to fork this repo and use it for your own channel. Minimal setup instructions are below.

## Setup

> [!NOTE]
> Node.js >=v20.6.0 is required to run this.

Install dependencies:

```sh
pnpm install
```

Rename the `.env.example` file to `.env`. Next, you'll need 2-3 things:

1. A Google AI API Key
2. A service Twitch account
3. A database (optional)

### API Key

Go to [aistudio.google.com](https://aistudio.google.com/app/apikey), click `Get API Key` on the left, and follow the instructions from there. Store the API key in the `.env` file.

### Twitch Account

> [!TIP]
> I would recommended a separate Twitch account to run this; however, if you *do* want to use yours, then the steps are the same.

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console)
   1. If you have an existing application:
      1. Add `https://twitchtokengenerator.com` as a redirect url
   2. If you don't have an application, create a new one:
      1. Use whatever name
      2. Use `https://twitchtokengenerator.com` for the redirect url
      3. Select `Chat Bot` for the category
      4. Select `Confidential` for the client type
   3. Paste the client ID and client secret into the `.env` file
2. Create a new Twitch account or use an existing one
3. Go to [twitchtokengenerator.com](https://twitchtokengenerator.com/)
   1. Select `Bot Chat Token`
   2. Fill in the Client Secret and Client ID fields.
   3. Scroll down and click `Generate Token`. The Client ID under the `Generated Tokens` section **should** match the one you provided.
   4. Store the access token and refresh token somewhere temporary.
4. Use [this site](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) to get the user ID of the account you just created. Store this in the `.env` file.

### Database

There are two ways to store token data: locally in a JSON file or a database. If you choose a JSON file, the file needs to look like this:

```json
{
  "accessToken": "",
  "refreshToken": "",
  "scopes": ["chat:edit", "chat:read"],
  "expiresIn": 0,
  "obtainmentTimestamp": 0
}
```

You'll need to read from this file and supply the data to `auth.addUser` and write to it in the `auth.onRefresh` event.

<details>
<summary>Replace the existing code in the auth region with this:</summary>

```js
const tokenData = await fs.readFile("path_to_json_file", "utf-8");

const auth = new RefreshingAuthProvider({
    clientId: process.env.TWITCH_CLIENT_ID!,
    clientSecret: process.env.TWITCH_CLIENT_SECRET!,
});

auth.onRefresh(async (_, data) => {
  await fs.writeFile("path_to_json_file", JSON.stringify(data))
})

auth.addUser(process.env.TWITCH_USER_ID!, JSON.parse(tokenData), ["chat"]);
```

</details>

If you want a more secure option, you can use a database, which is what this project uses. Your table should look similar to this (example uses PostgreSQL):

```sql
CREATE TABLE tokens (
  id SERIAL CONSTRAINT PRIMARY KEY,
  access_token VARCHAR(100),
  refresh_token VARCHAR(100),
  expires_in INT,
  obtainment_timestamp BIGINT
);
```

Once you have either of these options set up, fill in the access token and refresh token that you saved earlier.

## Customizing

### System instructions

In order to customize the bot's personality and responses, edit the [`instructions.txt`](./data/instructions.txt) file to your liking. It's better to provide more information in order to get more accurate responses. You can use the current file as a reference. [Further reading](https://www.promptingguide.ai/).

### Safety settings

Gemini's safety settings are for the AI's responses as opposed to what the user provides. They default to `BLOCK_MEDIUM_AND_ABOVE`. Obviously, set them appropriately to fit your channel's atmosphere. In most cases, the default settings will suffice, though some perfectly normal messages might get blocked. Play around with it until you find a happy medium. [Further reading](https://ai.google.dev/gemini-api/docs/safety-settings).

### Character limit

The character limit for a Twitch message is 500, so you should set `MAX_OUTPUT_LENGTH` to something under that. It *is* possible to set a higher limit, and the bot will send parts of the full response in separate messages, but I don't recommend doing this as it can flood chat quickly.
