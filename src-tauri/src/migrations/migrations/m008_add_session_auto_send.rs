use crate::migrations::Migration;

/// M008: add_session_auto_send
pub struct M008AddSessionAutoSend;

impl M008AddSessionAutoSend {
    pub fn new() -> Self { Self }
}

impl Migration for M008AddSessionAutoSend {
    fn name(&self) -> &'static str { "m_8_add_session_auto_send" }
    
    fn up(&self) -> &'static str {
        "ALTER TABLE connect_sessions ADD COLUMN auto_send boolean DEFAULT false NOT NULL;"
    }
    
    fn down(&self) -> Option<&'static str> {
        Some("SELECT 1;")
    }
}
