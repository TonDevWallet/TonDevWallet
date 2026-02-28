//! Database migrations module
//!
//! Provides a clean, type-safe migration system for SQLite databases.

mod runner;
mod migrations;
pub use runner::MigrationRunner;

use std::error::Error;
use std::fmt;

/// Result type for migration operations
pub type MigrationResult<T> = Result<T, MigrationError>;

/// Errors that can occur during migration operations
#[derive(Debug)]
pub enum MigrationError {
    SqlError(String),
    NotFound(String),
    ConnectionError(String),
    InvalidState(String),
}

impl fmt::Display for MigrationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MigrationError::SqlError(msg) => write!(f, "SQL error: {}", msg),
            MigrationError::NotFound(name) => write!(f, "Migration {} not found", name),
            MigrationError::ConnectionError(msg) => write!(f, "Connection error: {}", msg),
            MigrationError::InvalidState(msg) => write!(f, "Invalid state: {}", msg),
        }
    }
}

impl Error for MigrationError {}
/// Represents a single database migration
pub trait Migration {
    /// Unique identifier for this migration (e.g. m_1_create_keys)
    fn name(&self) -> &'static str;
    
    /// SQL statements to apply this migration
    fn up(&self) -> &'static str;
    
    /// SQL statements to revert this migration
    /// Returns None if the migration cannot be reverted
    fn down(&self) -> Option<&'static str> {
        None
    }
}

/// Returns all migrations in order
pub fn get_migrations() -> Vec<Box<dyn Migration>> {
    vec![
        Box::new(migrations::m001_create_keys::M001CreateKeys::new()),
        Box::new(migrations::m002_create_wallets::M002CreateWallets::new()),
        Box::new(migrations::m003_create_tonconnect::M003CreateTonConnect::new()),
        Box::new(migrations::m004_create_connect_messages::M004CreateConnectMessages::new()),
        Box::new(migrations::m005_add_session_manifest::M005AddSessionManifest::new()),
        Box::new(migrations::m006_add_settings::M006AddSettings::new()),
        Box::new(migrations::m007_add_last_selected_wallets::M007AddLastSelectedWallets::new()),
        Box::new(migrations::m008_add_session_auto_send::M008AddSessionAutoSend::new()),
        Box::new(migrations::m009_add_network_settings::M009AddNetworkSettings::new()),
        Box::new(migrations::m010_remove_message_session_foreign::M010RemoveMessageSessionForeign::new()),
        Box::new(migrations::m011_add_wallet_address::M011AddWalletAddress::new()),
        Box::new(migrations::m012_add_connect_sessions_autoincrement::M012AddConnectSessionsAutoincrement::new()),
        Box::new(migrations::m013_add_keys_autoincrement::M013AddKeysAutoincrement::new()),
        Box::new(migrations::m014_add_networks_autoincrement::M014AddNetworksAutoincrement::new()),
        Box::new(migrations::m015_add_wallets_autoincrement::M015AddWalletsAutoincrement::new()),
        Box::new(migrations::m016_fix_connect_sessions_foreign_keys::M016FixConnectSessionsForeignKeys::new()),
        Box::new(migrations::m017_fix_last_selected_wallets_foreign_keys::M017FixLastSelectedWalletsForeignKeys::new()),
        Box::new(migrations::m018_change_subwallet_id_type::M018ChangeSubwalletIdType::new()),
        Box::new(migrations::m019_add_wallet_extra_data::M019AddWalletExtraData::new()),
        Box::new(migrations::m020_add_wallet_name::M020AddWalletName::new()),
        Box::new(migrations::m021_add_wallet_workchain_id::M021AddWalletWorkchainId::new()),
        Box::new(migrations::m022_add_message_cell::M022AddMessageCell::new()),
        Box::new(migrations::m023_create_address_book::M023CreateAddressBook::new()),
        Box::new(migrations::m024_add_message_mode::M024AddMessageMode::new()),
        Box::new(migrations::m025_add_message_type::M025AddMessageType::new()),
        Box::new(migrations::m026_add_sign_payload::M026AddSignPayload::new()),
        Box::new(migrations::m027_add_toncenter3_url::M027AddToncenter3Url::new()),
        Box::new(migrations::m028_add_key_sign_type::M028AddKeySignType::new()),
        Box::new(migrations::m029_add_lite_engine_host::M029AddLiteEngineHost::new()),
        Box::new(migrations::m030_add_plugin_address::M030AddPluginAddress::new()),
        Box::new(migrations::m031_add_plugins_to_remove::M031AddPluginsToRemove::new()),
        Box::new(migrations::m032_add_tonapi_network_settings::M032AddTonapiNetworkSettings::new()),
        Box::new(migrations::m033_add_chain_id::M033AddChainId::new()),
    ]
}
