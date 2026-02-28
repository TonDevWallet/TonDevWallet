use crate::migrations::Migration;

/// M006: add_settings
pub struct M006AddSettings;

impl M006AddSettings {
    pub fn new() -> Self { Self }
}

impl Migration for M006AddSettings {
    fn name(&self) -> &'static str { "m_6_add_settings" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE settings (
            name text PRIMARY KEY,
            value text
        );
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("DROP TABLE settings;")
    }
}
