use crate::migrations::Migration;

/// M009: add_network_settings
pub struct M009AddNetworkSettings;

impl M009AddNetworkSettings {
    pub fn new() -> Self { Self }
}

impl Migration for M009AddNetworkSettings {
    fn name(&self) -> &'static str { "m_9_add_network_settings" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE networks (
            network_id integer PRIMARY KEY,
            name text NOT NULL,
            url text NOT NULL,
            item_order integer NOT NULL,
            is_default boolean NOT NULL,
            is_testnet boolean NOT NULL,
            scanner_url text,
            created_at timestamp,
            updated_at timestamp
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE networks;")
    }
}
