use crate::migrations::Migration;

/// M021: add_wallet_workchain_id
pub struct M021AddWalletWorkchainId;

impl M021AddWalletWorkchainId { pub fn new() -> Self { Self } }

impl Migration for M021AddWalletWorkchainId {
    fn name(&self) -> &'static str { "m_21_add_wallet_workchain_id" }
    fn up(&self) -> &'static str { "ALTER TABLE wallets ADD workchain_id integer;" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE wallets DROP workchain_id;") }
}
