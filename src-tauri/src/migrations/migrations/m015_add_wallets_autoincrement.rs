use crate::migrations::Migration;

/// M015: add_wallets_autoincrement
pub struct M015AddWalletsAutoincrement;

impl M015AddWalletsAutoincrement {
    pub fn new() -> Self { Self }
}

impl Migration for M015AddWalletsAutoincrement {
    fn name(&self) -> &'static str { "m_15_add_wallets_autoincrement" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE wallets RENAME TO wallets_old;
        
        CREATE TABLE wallets (
          id integer PRIMARY KEY AUTOINCREMENT,
          type text,
          key_id integer,
          subwallet_id integer, wallet_address text,

          FOREIGN KEY(key_id) REFERENCES "keys"(id)
        );
        
        INSERT INTO wallets (
          id,
          type,
          key_id,
          subwallet_id
        ) SELECT
          id,
          type,
          key_id,
          subwallet_id
        FROM wallets_old;
        DROP TABLE wallets_old;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE wallets RENAME TO wallets_old;

        CREATE TABLE wallets (
          id integer PRIMARY KEY,
          type text,
          key_id integer,
          subwallet_id integer, wallet_address text,

          FOREIGN KEY(key_id) REFERENCES "keys"(id)
        );
        
        INSERT INTO wallets (
          id,
          type,
          key_id,
          subwallet_id
        ) SELECT
          id,
          type,
          key_id,
          subwallet_id
        FROM wallets_old;
        DROP TABLE wallets_old;
        
        PRAGMA foreign_keys = ON;
        "#)
    }
}
