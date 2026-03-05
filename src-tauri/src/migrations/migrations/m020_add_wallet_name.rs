use crate::migrations::Migration;

/// M020: add_wallet_name
pub struct M020AddWalletName;

impl M020AddWalletName { pub fn new() -> Self { Self } }

impl Migration for M020AddWalletName {
    fn name(&self) -> &'static str { "m_20_add_wallet_name" }
    fn up(&self) -> &'static str { "ALTER TABLE wallets ADD name text;" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE wallets DROP name;") }
}
