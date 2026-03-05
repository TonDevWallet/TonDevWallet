use crate::migrations::Migration;

/// M028: add_key_sign_type
pub struct M028AddKeySignType;

impl M028AddKeySignType { pub fn new() -> Self { Self } }

impl Migration for M028AddKeySignType {
    fn name(&self) -> &'static str { "m_28_add_key_sign_type" }
    fn up(&self) -> &'static str { "ALTER TABLE keys ADD sign_type text DEFAULT 'ton';" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE keys DROP sign_type;") }
}
