#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rxing::multi::MultipleBarcodeReader;

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

#[cfg(any(target_os = "macos", windows, target_os = "linux"))]
use screenshots::Screen;

mod proxy;
mod ton_echo;

use proxy::spawn_proxy;
use ton_echo::{get_ton_echo_port, start_ton_echo_server};

use image::{self};
use rxing;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU16, Ordering};
use sysinfo::{System, SystemExt};
use tauri::{Emitter, Manager};
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
    let screens: Vec<Screen> = Screen::all().unwrap();

    let mut images: Vec<String> = Vec::new(); // = vec![String];
    for screen in screens {
        let captured = screen.capture().unwrap();
        let mut png = captured.to_png().unwrap();
        let i = image::load_from_memory_with_format(&mut png, image::ImageFormat::Png).unwrap();
        let multi_format_reader = rxing::MultiUseMultiFormatReader::default();
        let mut scanner = rxing::multi::GenericMultipleBarcodeReader::new(multi_format_reader);
        let mut hints = HashMap::new();

        hints
            .entry(rxing::DecodeHintType::TRY_HARDER)
            .or_insert(rxing::DecodeHintValue::TryHarder(true));

        let results = scanner
            .decode_multiple_with_hints(
                &mut rxing::BinaryBitmap::new(rxing::common::HybridBinarizer::new(
                    rxing::BufferedImageLuminanceSource::new(i),
                )),
                &mut hints,
            )
            .unwrap_or_default();

        if results.len() > 0 {
            images.push(results[0].getText().to_string());
            break;
        }
    }

    Ok(images)
}

use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
async fn detect_qr_code_from_image(data: String) -> Result<Vec<String>, String> {
    let mut images: Vec<String> = Vec::new(); // = vec![String];

    let mut image_data = general_purpose::STANDARD.decode(data).unwrap();
    let i = image::load_from_memory_with_format(&mut image_data, image::ImageFormat::Png).unwrap();
    let multi_format_reader = rxing::MultiUseMultiFormatReader::default();
    let mut scanner = rxing::multi::GenericMultipleBarcodeReader::new(multi_format_reader);
    let mut hints = HashMap::new();

    hints
        .entry(rxing::DecodeHintType::TRY_HARDER)
        .or_insert(rxing::DecodeHintValue::TryHarder(true));

    let results = scanner
        .decode_multiple_with_hints(
            &mut rxing::BinaryBitmap::new(rxing::common::HybridBinarizer::new(
                rxing::BufferedImageLuminanceSource::new(i),
            )),
            &mut hints,
        )
        .unwrap_or_default();

    if results.len() > 0 {
        images.push(results[0].getText().to_string());
    }

    Ok(images)
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

    #[cfg(target_os = "ios")]
    return Ok("ios".to_string());

    #[cfg(target_os = "android")]
    return Ok("android".to_string());
}

#[tauri::command]
fn get_ws_port() -> String {
    return PORT.load(Ordering::Relaxed).to_string();
}

#[tauri::command]
fn get_ton_echo_ws_port() -> String {
    return get_ton_echo_port().to_string();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // tauri_plugin_deep_link::prepare("de.fabianlars.deep-link-test");
    // register_urlhandler(None).unwrap();
    let _ = env_logger::try_init();
    let context = tauri::generate_context!();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build());
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            println!("{}, {argv:?}, {cwd}", app.package_info().name);
            app.emit("single-instance", Payload { args: argv, cwd })
                .unwrap();
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
    }
    builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    builder
        .setup(move |app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            #[cfg(desktop)]
            let _ = app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build());

            tauri::async_runtime::spawn(async move {
                let mut lst = TcpListener::bind("127.0.0.1:0").await.unwrap();
                // port = lst.local_addr().unwrap().port();
                PORT.store(lst.local_addr().unwrap().port(), Ordering::Relaxed);

                match spawn_proxy(&mut lst).await {
                    Ok(_) => (),
                    Err(e) => panic!("Listener Error {}", e),
                };
            });

            let app_handle = app.handle().clone();
            // Start TON echo server
            tauri::async_runtime::spawn(async move {
                match start_ton_echo_server(app_handle).await {
                    Ok(port) => {
                        println!("TON echo server started on port {}", port);
                    }
                    Err(e) => {
                        eprintln!("Failed to start TON echo server: {}", e);
                    }
                };
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ws_port,
            get_ton_echo_ws_port,
            get_os_name,
            detect_qr_code,
            detect_qr_code_from_image,
        ])
        .build(context)
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            _ => {}
        });
}
