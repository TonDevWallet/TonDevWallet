use crate::migrations::Migration;

/// M004: create_connect_messages
pub struct M004CreateConnectMessages;

impl M004CreateConnectMessages {
    pub fn new() -> Self { Self }
}

impl Migration for M004CreateConnectMessages {
    fn name(&self) -> &'static str { "m_4_create_connect_messages" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE connect_message_transactions (
            id integer PRIMARY KEY,
            connect_session_id integer,
            connect_event_id integer,
            key_id integer,
            wallet_id integer,
            status integer,
            payload text,
            FOREIGN KEY(key_id) REFERENCES keys(id),
            FOREIGN KEY(wallet_id) REFERENCES wallets(id),
            FOREIGN KEY(connect_session_id) REFERENCES connect_sessions(id)
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE connect_message_transactions;")
    }
}
