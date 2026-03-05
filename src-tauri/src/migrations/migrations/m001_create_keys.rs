use crate::migrations::Migration;

/// M001: create_keys
pub struct M001CreateKeys;

impl M001CreateKeys {
    pub fn new() -> Self { Self }
}

impl Migration for M001CreateKeys {
    fn name(&self) -> &'static str { "m_1_create_keys" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE keys (
            id integer PRIMARY KEY,
            encrypted text,
            public_key text UNIQUE,
            name text
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE keys;")
    }
}
