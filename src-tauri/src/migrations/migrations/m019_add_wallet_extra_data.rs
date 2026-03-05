use crate::migrations::Migration;

/// M019: add_wallet_extra_data
pub struct M019AddWalletExtraData;

impl M019AddWalletExtraData { pub fn new() -> Self { Self } }

impl Migration for M019AddWalletExtraData {
    fn name(&self) -> &'static str { "m_19_add_wallet_extra_data" }
    fn up(&self) -> &'static str { "ALTER TABLE wallets ADD extra_data text;" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE wallets DROP extra_data;") }
}
