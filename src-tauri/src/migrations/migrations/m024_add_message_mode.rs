use crate::migrations::Migration;

/// M024: add_message_mode
pub struct M024AddMessageMode;

impl M024AddMessageMode { pub fn new() -> Self { Self } }

impl Migration for M024AddMessageMode {
    fn name(&self) -> &'static str { "m_24_add_message_mode" }
    fn up(&self) -> &'static str { 
        "ALTER TABLE connect_message_transactions ADD COLUMN message_mode integer;" 
    }
    fn down(&self) -> Option<&'static str> { 
        Some("ALTER TABLE connect_message_transactions DROP COLUMN message_mode;") 
    }
}
