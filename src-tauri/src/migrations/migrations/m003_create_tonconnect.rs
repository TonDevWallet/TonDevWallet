use crate::migrations::Migration;

/// M003: create_tonconnect
pub struct M003CreateTonConnect;

impl M003CreateTonConnect {
    pub fn new() -> Self { Self }
}

impl Migration for M003CreateTonConnect {
    fn name(&self) -> &'static str { "m_3_create_tonconnect" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE connect_sessions (
            id integer PRIMARY KEY,
            secret_key text,
            user_id text,
            key_id integer,
            wallet_id integer,
            last_event_id integer,
            FOREIGN KEY(key_id) REFERENCES keys(id),
            FOREIGN KEY(wallet_id) REFERENCES wallets(id)
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE connect_sessions;")
    }
}
