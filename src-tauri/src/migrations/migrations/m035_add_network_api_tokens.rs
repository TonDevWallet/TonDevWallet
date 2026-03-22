use crate::migrations::Migration;

/// M035: per-network TonAPI bearer and TonCenter v3 API keys
pub struct M035AddNetworkApiTokens;

impl M035AddNetworkApiTokens {
    pub fn new() -> Self {
        Self
    }
}

impl Migration for M035AddNetworkApiTokens {
    fn name(&self) -> &'static str {
        "m_35_add_network_api_tokens"
    }

    fn up(&self) -> &'static str {
        r#"
        ALTER TABLE networks ADD COLUMN tonapi_token text;
        ALTER TABLE networks ADD COLUMN toncenter_token text;
        "#
    }

    fn down(&self) -> Option<&'static str> {
        Some(
            r#"
        ALTER TABLE networks DROP COLUMN toncenter_token;
        ALTER TABLE networks DROP COLUMN tonapi_token;
        "#,
        )
    }
}
