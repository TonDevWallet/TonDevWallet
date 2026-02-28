use crate::migrations::Migration;

/// M022: add_message_cell
pub struct M022AddMessageCell;

impl M022AddMessageCell { pub fn new() -> Self { Self } }

impl Migration for M022AddMessageCell {
    fn name(&self) -> &'static str { "m_22_add_message_cell" }
    fn up(&self) -> &'static str { 
        "ALTER TABLE connect_message_transactions ADD COLUMN message_cell text;" 
    }
    fn down(&self) -> Option<&'static str> { 
        Some("ALTER TABLE connect_message_transactions DROP COLUMN message_cell;") 
    }
}
