use crate::migrations::Migration;

/// M032: add_tonapi_network_settings
pub struct M032AddTonapiNetworkSettings;

impl M032AddTonapiNetworkSettings {
    pub fn new() -> Self { Self }
}

impl Migration for M032AddTonapiNetworkSettings {
    fn name(&self) -> &'static str { "m_32_add_tonapi_network_settings" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE networks ADD COLUMN use_tonapi_only integer DEFAULT 0;
        ALTER TABLE networks ADD COLUMN tonapi_url text;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE networks DROP COLUMN tonapi_url;
        ALTER TABLE networks DROP COLUMN use_tonapi_only;
        "#)
    }
}
