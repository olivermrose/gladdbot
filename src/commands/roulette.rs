
use crate::commands::Context;
use gladdbot_macros::command;

use rand::prelude::*;

#[command(user_cooldown = 300)]
pub async fn roulette(_ctx: Context) {
    let mut rng = rand::rng();
    let chance = rng.random_range(0..10_000);

    match chance {
        // 0.5%
        0..=49 => (),

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
}
