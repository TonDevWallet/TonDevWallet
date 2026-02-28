use crate::migrations::Migration;

/// M031: add_plugins_to_remove
pub struct M031AddPluginsToRemove;

impl M031AddPluginsToRemove {
    pub fn new() -> Self { Self }
}

impl Migration for M031AddPluginsToRemove {
    fn name(&self) -> &'static str { "m_31_add_plugins_to_remove" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE connect_message_transactions ADD COLUMN plugins_to_remove text;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE connect_message_transactions DROP COLUMN plugins_to_remove;
        "#)
    }
}
