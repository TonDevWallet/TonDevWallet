use crate::migrations::Migration;

/// M011: add_wallet_address
pub struct M011AddWalletAddress;

impl M011AddWalletAddress { pub fn new() -> Self { Self } }

impl Migration for M011AddWalletAddress {
    fn name(&self) -> &'static str { "m_11_add_wallet_address" }
    fn up(&self) -> &'static str { "ALTER TABLE wallets ADD wallet_address text;" }
    fn down(&self) -> Option<&'static str> { Some("ALTER TABLE wallets DROP wallet_address;") }
}
