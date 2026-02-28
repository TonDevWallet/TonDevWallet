use crate::migrations::Migration;

/// M025: add_message_type
pub struct M025AddMessageType;

impl M025AddMessageType { pub fn new() -> Self { Self } }

impl Migration for M025AddMessageType {
    fn name(&self) -> &'static str { "m_25_add_message_type" }
    fn up(&self) -> &'static str { 
        r#"
        ALTER TABLE connect_message_transactions
        ADD COLUMN message_type text;
        UPDATE connect_message_transactions
        SET message_type = 'tx'
        WHERE message_type IS NULL OR message_type = '';
        "#
    }
    fn down(&self) -> Option<&'static str> { 
        Some("ALTER TABLE connect_message_transactions DROP COLUMN message_type;") 
    }
}
