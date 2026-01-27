use gladdbot_macros::command;
use twitch_irc::message::PrivmsgMessage;

use crate::commands::Context;

#[command]
pub async fn hi(ctx: Context, msg: PrivmsgMessage) {
    ctx.irc.say_in_reply_to(&msg, "Hi there!".into()).await.ok();
}
