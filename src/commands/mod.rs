use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use redis::aio::MultiplexedConnection;
use twitch_api::HelixClient;
pub use twitch_irc::message::PrivmsgMessage;

use crate::irc::IrcClient;

pub mod counter;
pub mod hi;
pub mod roulette;

pub struct CommandRegistration {
    pub factory: fn() -> Box<dyn Command>,
}

inventory::collect!(CommandRegistration);

pub struct Context {
    pub args: Vec<String>,
    pub twitch: Arc<HelixClient<'static, reqwest::Client>>,
    pub db: Arc<tokio_postgres::Client>,
    pub redis: MultiplexedConnection,
    pub irc: Arc<IrcClient>,
}

#[async_trait]
pub trait Command: Send + Sync {
    fn name(&self) -> &str;
    fn aliases(&self) -> Vec<&str>;
    fn global_cooldown(&self) -> Duration;
    fn user_cooldown(&self) -> Duration;
    fn mod_only(&self) -> bool;

    async fn execute(&self, ctx: Context, msg: PrivmsgMessage) -> anyhow::Result<()>;
}
