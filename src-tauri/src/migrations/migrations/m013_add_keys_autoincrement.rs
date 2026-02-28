use crate::migrations::Migration;

/// M013: add_keys_autoincrement
pub struct M013AddKeysAutoincrement;

impl M013AddKeysAutoincrement {
    pub fn new() -> Self { Self }
}

impl Migration for M013AddKeysAutoincrement {
    fn name(&self) -> &'static str { "m_13_add_keys_autoincrement" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;

        ALTER TABLE keys RENAME TO keys_old;
        
        CREATE TABLE keys (
          id integer PRIMARY KEY AUTOINCREMENT,
          encrypted text,
          public_key text UNIQUE,
          name text
        );
        
        INSERT INTO keys (
          id,
          encrypted,
          public_key,
          name
        ) SELECT
          id,
          encrypted,
          public_key,
          name
        FROM keys_old;
        DROP TABLE keys_old;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;
        ALTER TABLE keys RENAME TO keys_old;

        CREATE TABLE keys (
          id integer PRIMARY KEY,
          encrypted text,
          public_key text UNIQUE,
          name text
        );
        
        INSERT INTO keys (
          id,
          encrypted,
          public_key,
          name
        ) SELECT
          id,
          encrypted,
          public_key,
          name
        FROM keys_old;
        DROP TABLE keys_old;
        
        PRAGMA foreign_keys = ON;
        "#)
    }
}
