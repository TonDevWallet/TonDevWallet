use crate::migrations::Migration;

/// M027: add_toncenter3_url
pub struct M027AddToncenter3Url;

impl M027AddToncenter3Url { pub fn new() -> Self { Self } }

impl Migration for M027AddToncenter3Url {
    fn name(&self) -> &'static str { "m_27_add_toncenter3_url" }
    fn up(&self) -> &'static str { "ALTER TABLE networks ADD COLUMN toncenter3_url text;" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE networks DROP COLUMN toncenter3_url;") }
}
