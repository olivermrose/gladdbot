use std::env;

use crate::commands::Context;
use anyhow::Result;
use gladdbot_macros::command;

use rand::prelude::*;
use twitch_irc::message::PrivmsgMessage;

#[command(user_cooldown = 300)]
pub async fn roulette(ctx: Context, msg: PrivmsgMessage) -> Result<()> {
    let mut rng = rand::rng();
    let chance = rng.random_range(0..10_000);

    match chance {
        // 0.5%
        0..=49 => {
            ctx.twitch
                .ban_user(
                    msg.sender.id,
                    "Roulette: 10 minute timeout",
                    600,
                    msg.channel_id,
                    env::var("TWITCH_USER_ID")?,
                    "token".into(),
                )
                .await?;
        }

        // 1.5%
        50..=199 => (),

        // 3%
        200..=499 => (),

        // 5%
        500..=999 => (),

        // 90%
        1000..=9999 => (),
        _ => unreachable!(),
    }

    Ok(())
}
