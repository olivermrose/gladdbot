use std::sync::Arc;

use redis::RedisError;
use redis::aio::MultiplexedConnection;
use tokio_postgres::{Client as PgClient, Error as PgError, NoTls};
use tracing::Instrument;

#[tracing::instrument]
pub async fn init_pg(connection_str: &str) -> Result<Arc<PgClient>, PgError> {
    let (client, connection) = tokio_postgres::connect(connection_str, NoTls).await?;

    tokio::spawn(
        async move {
            if let Err(e) = connection.await {
                tracing::error!(%e, "connection error");
            }
        }
        .in_current_span(),
    );

    Ok(Arc::new(client))
}

#[tracing::instrument]
pub async fn init_redis(connection_str: &str) -> Result<MultiplexedConnection, RedisError> {
    let client = redis::Client::open(connection_str)?;
    let connection = client.get_multiplexed_async_connection().await?;

    Ok(connection)
}
