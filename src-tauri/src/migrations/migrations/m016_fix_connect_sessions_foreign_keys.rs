use crate::migrations::Migration;

/// M016: fix_connect_sessions_foreign_keys
pub struct M016FixConnectSessionsForeignKeys;

impl M016FixConnectSessionsForeignKeys {
    pub fn new() -> Self { Self }
}

impl Migration for M016FixConnectSessionsForeignKeys {
    fn name(&self) -> &'static str { "m_16_fix_connect_sessions_foreign_keys" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE connect_sessions RENAME TO connect_sessions_old;
        
        CREATE TABLE connect_sessions (
          id integer PRIMARY KEY AUTOINCREMENT,
          secret_key text,
          user_id text,
          key_id integer,
          wallet_id integer,
          last_event_id integer,
          url text,
          name text,
          icon_url text,
          auto_send boolean DEFAULT false NOT NULL,

          FOREIGN KEY(key_id) REFERENCES keys(id),
          FOREIGN KEY(wallet_id) REFERENCES wallets(id)
        );
        
        INSERT INTO connect_sessions (
          id,
          secret_key,
          user_id,
          key_id,
          wallet_id,
          last_event_id,
          url,
          name,
          icon_url,
          auto_send
        ) SELECT
          id,
          secret_key,
          user_id,
          key_id,
          wallet_id,
          last_event_id,
          url,
          name,
          icon_url,
          auto_send
        FROM connect_sessions_old;
        DROP TABLE connect_sessions_old;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE connect_sessions RENAME TO connect_sessions_old;

        CREATE TABLE connect_sessions (
          id integer PRIMARY KEY,
          secret_key text,
          user_id text,
          key_id integer,
          wallet_id integer,
          last_event_id integer,
          url text,
          name text,
          icon_url text,
          auto_send boolean DEFAULT false NOT NULL,

          FOREIGN KEY(key_id) REFERENCES keys(id),
          FOREIGN KEY(wallet_id) REFERENCES wallets(id)
        )

        INSERT INTO connect_sessions (
          id,
          secret_key,
          user_id,
          key_id,
          wallet_id,
          last_event_id,
          url,
          name,
          icon_url,
          auto_send
        ) SELECT
          id,
          secret_key,
          user_id,
          key_id,
          wallet_id,
          last_event_id,
          url,
          name,
          icon_url,
          auto_send
        FROM connect_sessions_old;
        DROP TABLE connect_sessions_old;
        
        PRAGMA foreign_keys = ON;
        "#)
    }
}
