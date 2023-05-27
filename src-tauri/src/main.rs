#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

mod colors;
mod proxy;
mod register_uri;

use base64;
use base64::{engine::general_purpose, Engine as _};
use proxy::spawn_proxy;
use screenshots::Screen;
use std::sync::atomic::{AtomicU16, Ordering};
use sysinfo::{System, SystemExt};
use tauri::Manager;
use tauri_plugin_sql::TauriSql;
use tokio::net::TcpListener;

static PORT: AtomicU16 = AtomicU16::new(0);

#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

pub fn is_win_11() -> bool {
    let sys = System::new_all();
    let version = sys.os_version().unwrap();
    let version = version.split('(').collect::<Vec<&str>>()[1]
        .split(')')
        .collect::<Vec<&str>>()[0];
    let version: u32 = version.split('.').collect::<Vec<&str>>()[0]
        .parse()
        .unwrap();
    version >= 22000
}

#[tauri::command]
async fn detect_qr_code() -> Result<Vec<String>, String> {
    let screens = Screen::all().unwrap();

    let mut images: Vec<String> = Vec::new(); // = vec![String];
    for screen in screens {
        let image = screen.capture().unwrap();
        let buffer = image.buffer();
        let encoded: String = general_purpose::STANDARD_NO_PAD.encode(&buffer); // ::encode(input); //::STANDARD::encode(&buffer);
        images.push(encoded);
    }

    Ok(images)
}

#[cfg(target_os = "windows")]
#[tauri::command]
#[inline]
fn change_transparent_effect(window: tauri::Window) {
    if is_win_11() {
        use window_vibrancy::{apply_mica, clear_mica};
        clear_mica(&window).unwrap();
        apply_mica(&window).unwrap()
    }
}

#[cfg(target_os = "linux")]
#[tauri::command]
fn change_transparent_effect(window: tauri::Window) {}

#[cfg(target_os = "macos")]
#[tauri::command]
fn change_transparent_effect(window: tauri::Window) {
    apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
        .expect("Unsupported platform! 'apply_vibrancy' is only supported on macOS");
}

// #[cfg(not(target_os = "windows"))]
#[tauri::command]
fn get_os_name() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    if is_win_11() {
        return Ok("windows11".to_string());
    } else {
        return Ok("windows".to_string());
    }

    #[cfg(target_os = "macos")]
    return Ok("macos".to_string());

    #[cfg(target_os = "linux")]
    return Ok("linux".to_string());
}

#[tauri::command]
fn get_ws_port() -> String {
    return PORT.load(Ordering::Relaxed).to_string();
}

fn main() {
    tauri_plugin_deep_link::prepare("de.fabianlars.deep-link-test");
    // register_urlhandler(None).unwrap();
    let _ = env_logger::try_init();
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .plugin(TauriSql::default())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit_all("single-instance", Payload { args: argv, cwd })
                .unwrap();
        }))
        .setup(move |app| {
            tauri::async_runtime::spawn(async move {
                let mut lst = TcpListener::bind("127.0.0.1:0").await.unwrap();
                // port = lst.local_addr().unwrap().port();
                PORT.store(lst.local_addr().unwrap().port(), Ordering::Relaxed);

                match spawn_proxy(&mut lst).await {
                    Ok(_) => (),
                    Err(e) => panic!("Listener Error {}", e),
                };
            });

            let window = app.get_window("main").unwrap();

            change_transparent_effect(window.clone());

            let handle = app.handle();
            tauri_plugin_deep_link::register(
                "tondevwallet",
                move |request| {
                dbg!(&request);
                handle.emit_all("single-instance", request).unwrap();
                },
            )
            .unwrap(/* If listening to the scheme is optional for your app, you don't want to unwrap here. */);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ws_port,
            colors::get_system_colors,
            get_os_name,
            detect_qr_code,
            change_transparent_effect
        ])
        .build(context)
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            _ => {}
        });
}
