#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod proxy;

use std::{sync::atomic::{Ordering, AtomicU16}};

use proxy::spawn_proxy;
use tauri_plugin_sql::TauriSql;
use tokio::net::TcpListener;

static PORT: AtomicU16 = AtomicU16::new(0);

fn main() {
  let _ = env_logger::try_init();

  tauri::Builder::default()
    .plugin(TauriSql::default())
    .setup(move |_app| {
      tauri::async_runtime::spawn(async move {
        let mut lst = TcpListener::bind("127.0.0.1:0").await.unwrap();
        // port = lst.local_addr().unwrap().port();
        PORT.store(lst.local_addr().unwrap().port(), Ordering::Relaxed);
        spawn_proxy(&mut lst).await;
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_ws_port])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_ws_port () -> String {
  return PORT.load(Ordering::Relaxed).to_string();
}
