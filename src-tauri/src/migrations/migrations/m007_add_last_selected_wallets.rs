use crate::migrations::Migration;

/// M007: add_last_selected_wallets
pub struct M007AddLastSelectedWallets;

impl M007AddLastSelectedWallets {
    pub fn new() -> Self { Self }
}

impl Migration for M007AddLastSelectedWallets {
    fn name(&self) -> &'static str { "m_7_add_last_selected_wallets" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE last_selected_wallets (
            url text PRIMARY KEY,
            key_id integer,
            wallet_id integer,
            FOREIGN KEY(key_id) REFERENCES keys(id),
            FOREIGN KEY(wallet_id) REFERENCES wallets(id)
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE last_selected_wallets;")
    }
}
