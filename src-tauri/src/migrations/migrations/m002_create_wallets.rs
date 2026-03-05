use crate::migrations::Migration;

/// M002: create_wallets
pub struct M002CreateWallets;

impl M002CreateWallets {
    pub fn new() -> Self { Self }
}

impl Migration for M002CreateWallets {
    fn name(&self) -> &'static str { "m_2_create_wallets" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE wallets (
            id integer PRIMARY KEY,
            type text,
            key_id integer,
            subwallet_id integer,
            FOREIGN KEY(key_id) REFERENCES keys(id)
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE wallets;")
    }
}
