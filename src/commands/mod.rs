use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use redis::aio::MultiplexedConnection;
use reqwest::Client as ReqwestClient;
use twitch_api::HelixClient;
use twitch_irc::message::PrivmsgMessage;

use crate::irc::IrcClient;

pub mod roulette;

pub struct Context {
    pub args: Vec<String>,
    pub msg: PrivmsgMessage,
    pub twitch: Arc<HelixClient<'static, ReqwestClient>>,
    pub db: Arc<tokio_postgres::Client>,
    pub redis: MultiplexedConnection,
    pub irc: Arc<IrcClient>,
}

#[async_trait::async_trait]
pub trait Command: Send + Sync {
    fn name(&self) -> &'static str;
    fn aliases(&self) -> Vec<&'static str>;
    fn global_cooldown(&self) -> Duration;
    fn user_cooldown(&self) -> Duration;
    fn mod_only(&self) -> bool;
    async fn execute(&self, ctx: Context) -> anyhow::Result<()>;
}

pub type CommandRegistry = HashMap<String, Box<dyn Command>>;
