use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::mpsc::UnboundedReceiver;
use twitch_irc::login::{RefreshingLoginCredentials, TokenStorage, UserAccessToken};
use twitch_irc::message::ServerMessage;
use twitch_irc::{ClientConfig, SecureTCPTransport, TwitchIRCClient};

#[derive(Debug)]
pub struct DbTokenStorage {
    db: Arc<tokio_postgres::Client>,
}

#[async_trait]
impl TokenStorage for DbTokenStorage {
    type LoadError = tokio_postgres::Error;
    type UpdateError = tokio_postgres::Error;

    async fn load_token(&mut self) -> Result<UserAccessToken, Self::LoadError> {
        let row = self
            .db
            .query_one("SELECT* FROM tokens ORDER BY id DESC", &[])
            .await?;

        Ok(UserAccessToken {
            access_token: row.get("access_token"),
            refresh_token: row.get("refresh_token"),
            expires_at: row.get("expires_at"),
            created_at: row.get("created_at"),
        })
    }

    async fn update_token(&mut self, token: &UserAccessToken) -> Result<(), Self::UpdateError> {
        self.db
            .execute(
                r"INSERT INTO tokens (
					access_token,
					refresh_token,
					expires_at
					created_at,
				) VALUES ($1, $2, $3, $4)",
                &[
                    &token.access_token,
                    &token.refresh_token,
                    &token.expires_at,
                    &token.created_at,
                ],
            )
            .await?;

        Ok(())
    }
}

pub type IrcClient =
    TwitchIRCClient<SecureTCPTransport, RefreshingLoginCredentials<DbTokenStorage>>;

pub fn init_irc(
    pg_client: Arc<tokio_postgres::Client>,
) -> (UnboundedReceiver<ServerMessage>, Arc<IrcClient>) {
    let token_storage = DbTokenStorage { db: pg_client };

    let credentials = RefreshingLoginCredentials::init(
        std::env::var("TWITCH_CLIENT_ID").expect("TWITCH_CLIENT_ID not set"),
        std::env::var("TWITCH_CLIENT_SECRET").expect("TWITCH_CLIENT_SECRET not set"),
        token_storage,
    );

    let config = ClientConfig::new_simple(credentials);

    let (recv, client) = TwitchIRCClient::<_, _>::new(config);

    (recv, Arc::new(client))
}
