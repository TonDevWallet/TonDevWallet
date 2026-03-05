use crate::migrations::Migration;

/// M033: add_chain_id
pub struct M033AddChainId;

impl M033AddChainId {
    pub fn new() -> Self { Self }
}

impl Migration for M033AddChainId {
    fn name(&self) -> &'static str { "m_33_add_chain_id" }
    
    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE networks ADD COLUMN chain_id integer;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        ALTER TABLE networks DROP COLUMN chain_id;
        "#)
    }
}
