use crate::migrations::Migration;

/// M026: add_sign_payload
pub struct M026AddSignPayload;

impl M026AddSignPayload { pub fn new() -> Self { Self } }

impl Migration for M026AddSignPayload {
    fn name(&self) -> &'static str { "m_26_add_sign_payload" }
    fn up(&self) -> &'static str { 
        "ALTER TABLE connect_message_transactions ADD COLUMN sign_payload text;" 
    }
    fn down(&self) -> Option<&'static str> { 
        Some("ALTER TABLE connect_message_transactions DROP COLUMN sign_payload;") 
    }
}
