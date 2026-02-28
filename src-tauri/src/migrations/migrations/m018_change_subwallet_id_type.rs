use crate::migrations::Migration;

/// M018: change_subwallet_id_type
pub struct M018ChangeSubwalletIdType;

impl M018ChangeSubwalletIdType {
    pub fn new() -> Self { Self }
}

impl Migration for M018ChangeSubwalletIdType {
    fn name(&self) -> &'static str { "m_18_change_subwallet_id_type" }
    
    fn up(&self) -> &'static str {
        r#"
        PRAGMA foreign_keys = OFF;
        
        -- Add a new column with the desired type
        ALTER TABLE wallets ADD COLUMN new_subwallet_id text;

        -- Copy data from the old column to the new one
        UPDATE wallets SET new_subwallet_id = CAST(subwallet_id AS text);

        -- Drop the old column
        ALTER TABLE wallets DROP COLUMN subwallet_id;

        -- Rename the new column to the original name
        ALTER TABLE wallets RENAME COLUMN new_subwallet_id TO subwallet_id;

        PRAGMA foreign_keys = ON;
        "#
    }
    
    fn down(&self) -> Option<&'static str> {
        Some(r#"
        PRAGMA foreign_keys = OFF;

        -- Add a new column with the original type
        ALTER TABLE wallets ADD COLUMN new_subwallet_id integer;

        -- Copy data from the text column to the integer one
        UPDATE wallets SET new_subwallet_id = CAST(subwallet_id AS integer);

        -- Drop the text column
        ALTER TABLE wallets DROP COLUMN subwallet_id;

        -- Rename the new column to the original name
        ALTER TABLE wallets RENAME COLUMN new_subwallet_id TO subwallet_id;

        PRAGMA foreign_keys = ON;
        "#)
    }
}
