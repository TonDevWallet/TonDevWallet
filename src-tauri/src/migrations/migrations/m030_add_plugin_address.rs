use crate::migrations::Migration;

/// M030: add_plugin_address
pub struct M030AddPluginAddress;

impl M030AddPluginAddress {
    pub fn new() -> Self { Self }
}

impl Migration for M030AddPluginAddress {
    fn name(&self) -> &'static str { "m_30_add_plugin_address" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE connect_message_transactions ADD COLUMN plugin_address text;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE connect_message_transactions DROP COLUMN plugin_address;
        "#)
    }
}
