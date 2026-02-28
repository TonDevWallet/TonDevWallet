use crate::migrations::Migration;

/// M017: fix_last_selected_wallets_foreign_keys
pub struct M017FixLastSelectedWalletsForeignKeys;

impl M017FixLastSelectedWalletsForeignKeys {
    pub fn new() -> Self { Self }
}

impl Migration for M017FixLastSelectedWalletsForeignKeys {
    fn name(&self) -> &'static str { "m_17_fix_last_selected_wallets_foreign_keys" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE last_selected_wallets RENAME TO last_selected_wallets_old;
        
        CREATE TABLE last_selected_wallets (
          url text PRIMARY KEY,
          key_id integer,
          wallet_id integer,

          FOREIGN KEY(key_id) REFERENCES "keys"(id),
          FOREIGN KEY(wallet_id) REFERENCES "wallets"(id)
        );
        
        INSERT INTO last_selected_wallets (
          url,
          key_id,
          wallet_id
        ) SELECT
          url,
          key_id,
          wallet_id
        FROM last_selected_wallets_old;
        DROP TABLE last_selected_wallets_old;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE last_selected_wallets RENAME TO last_selected_wallets_old;
        
        CREATE TABLE last_selected_wallets (
          url text PRIMARY KEY,
          key_id integer,
          wallet_id integer,

          FOREIGN KEY(key_id) REFERENCES "keys"(id),
          FOREIGN KEY(wallet_id) REFERENCES "wallets"(id)
        );
        
        INSERT INTO last_selected_wallets (
          url,
          key_id,
          wallet_id
        ) SELECT
          url,
          key_id,
          wallet_id
        FROM last_selected_wallets_old;
        DROP TABLE last_selected_wallets_old;

        PRAGMA foreign_keys = ON;
        "#)
    }
}
