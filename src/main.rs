use std::collections::HashMap;
use std::env;
use std::sync::Arc;

use anyhow::Result;

use twitch_api::HelixClient;
use twitch_irc::message::ServerMessage;

use crate::commands::{Command, Context};

mod commands;
mod db;
mod irc;

const CHANNELS: [&str; 2] = ["breadkissed", "gladd"];

#[tracing::instrument]
#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv()?;

    let pg_client = db::init_pg(&env::var("POSTGRES_URL")?).await?;
    let redis_client = db::init_redis(&env::var("REDIS_URL")?).await?;

    let (mut incoming, irc_client) = irc::init_irc(pg_client.clone());

    let reqwest_client = reqwest::Client::default();
    let helix_client = Arc::new(HelixClient::with_client(reqwest_client));

    let mut registry = HashMap::<String, Box<dyn Command>>::new();

    for entry in inventory::iter::<commands::CommandRegistration> {
        let cmd = (entry.factory)();
        registry.insert(cmd.name().to_string(), cmd);
    }

    let client = irc_client.clone();

    let handle = tokio::spawn(async move {
        while let Some(message) = incoming.recv().await {
            match message {
                ServerMessage::Privmsg(data) => {
                    if data.message_text.starts_with("!") {
                        let mut split = data.message_text.split_whitespace();

                        if let Some(command_part) = split.next() {
                            let command_name = &command_part[1..];
                            let args: Vec<String> = split.map(|s| s.to_string()).collect();

                            if let Some(cmd) = registry.get(command_name) {
                                if cmd.mod_only()
                                    && !data.badges.iter().any(|badge| badge.name == "moderator")
                                {
                                    continue;
                                }

                                // Check cooldowns logic here (TODO)

                                let ctx = Context {
                                    args,
                                    twitch: helix_client.clone(),
                                    db: pg_client.clone(),
                                    redis: redis_client.clone(),
                                    irc: client.clone(),
                                };

                                if let Err(e) = cmd.execute(ctx, data).await {
                                    tracing::error!(%e, "Command executed failed");
                                }
                            }
                        }
                    }
                }
                _ => (),
            }
        }
    });

    for channel in CHANNELS {
        irc_client.join(channel.into()).unwrap();
    }

    handle.await.unwrap();

    Ok(())
}
