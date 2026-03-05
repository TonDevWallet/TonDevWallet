use crate::migrations::Migration;

/// M023: create_address_book
pub struct M023CreateAddressBook;

impl M023CreateAddressBook { pub fn new() -> Self { Self } }

impl Migration for M023CreateAddressBook {
    fn name(&self) -> &'static str { "m_23_create_address_book" }
    
    fn up(&self) -> &'static str {
        r#"
        CREATE TABLE address_book (
            address_book_id integer PRIMARY KEY AUTOINCREMENT,
            network_id integer NOT NULL,
            address text NOT NULL,
            title text NOT NULL,
            description text,
            created_at integer NOT NULL
        );
        CREATE INDEX idx_address_book_network_id ON address_book(network_id);
        "#
    }
    
    fn down(&self) -> Option<&'static str> { Some("DROP TABLE address_book;") }
}
