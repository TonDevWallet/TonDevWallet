use crate::migrations::Migration;

/// M005: add_session_manifest
pub struct M005AddSessionManifest;

impl M005AddSessionManifest {
    pub fn new() -> Self { Self }
}

impl Migration for M005AddSessionManifest {
    fn name(&self) -> &'static str { "m_5_add_session_manifest" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE connect_sessions
          ADD url text;
        ALTER TABLE connect_sessions
          ADD name text;
        ALTER TABLE connect_sessions
          ADD icon_url text;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE connect_sessions
          DROP url;
        ALTER TABLE connect_sessions
          DROP name;
        ALTER TABLE connect_sessions
          DROP icon_url;
        "#)
    }
}
