use crate::migrations::Migration;

/// M034: add blockchain_source (liteclient | tonapi | toncenter), migrate from use_tonapi_only, drop use_tonapi_only
pub struct M034AddBlockchainSource;

impl M034AddBlockchainSource {
    pub fn new() -> Self {
        Self
    }
}

impl Migration for M034AddBlockchainSource {
    fn name(&self) -> &'static str {
        "m_34_add_blockchain_source"
    }

    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE networks ADD COLUMN blockchain_source text NOT NULL DEFAULT 'liteclient';
        UPDATE networks SET blockchain_source = 'tonapi' WHERE use_tonapi_only = 1;
        ALTER TABLE networks DROP COLUMN use_tonapi_only;
        "#
    }

    fn down(&self) -> Option<&'static str> {
        Some(
            r#"
        ALTER TABLE networks ADD COLUMN use_tonapi_only integer NOT NULL DEFAULT 0;
        UPDATE networks SET use_tonapi_only = 1 WHERE blockchain_source = 'tonapi';
        ALTER TABLE networks DROP COLUMN blockchain_source;
        "#,
        )
    }
}
