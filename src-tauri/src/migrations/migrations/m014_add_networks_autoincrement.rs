use crate::migrations::Migration;

/// M014: add_networks_autoincrement
pub struct M014AddNetworksAutoincrement;

impl M014AddNetworksAutoincrement {
    pub fn new() -> Self { Self }
}

impl Migration for M014AddNetworksAutoincrement {
    fn name(&self) -> &'static str { "m_14_add_networks_autoincrement" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE networks RENAME TO networks_old;
        
        CREATE TABLE networks (
          network_id integer PRIMARY KEY AUTOINCREMENT,
          name text NOT NULL,
          url text NOT NULL,
          item_order integer NOT NULL,
          is_default boolean NOT NULL,
          
          is_testnet boolean NOT NULL,
          scanner_url text,

          created_at timestamp,
          updated_at timestamp
        );
        
        INSERT INTO networks (
          network_id,
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          created_at,
          updated_at
        ) SELECT
          network_id,
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          created_at,
          updated_at
        FROM networks_old;
        DROP TABLE networks_old;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE networks RENAME TO networks_old;

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
        
        INSERT INTO networks (
          network_id,
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          created_at,
          updated_at
        ) SELECT
          network_id,
          name,
          url,
          item_order,
          is_default,
          is_testnet,
          scanner_url,
          created_at,
          updated_at
        FROM networks_old;
        DROP TABLE networks_old;
        
        PRAGMA foreign_keys = ON;
        "#)
    }
}
