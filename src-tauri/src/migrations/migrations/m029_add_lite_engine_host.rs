use crate::migrations::Migration;

/// M029: add_lite_engine_host
pub struct M029AddLiteEngineHost;

impl M029AddLiteEngineHost {
    pub fn new() -> Self { Self }
}

impl Migration for M029AddLiteEngineHost {
    fn name(&self) -> &'static str { "m_29_add_lite_engine_host" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE networks ADD COLUMN lite_engine_host_mode text DEFAULT 'auto';
        ALTER TABLE networks ADD COLUMN lite_engine_host_custom text;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE networks DROP COLUMN lite_engine_host_custom;
        ALTER TABLE networks DROP COLUMN lite_engine_host_mode;
        "#)
    }
}
