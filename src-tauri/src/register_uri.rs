use std::{
  io,
};


#[cfg(not(target_os = "windows"))]
pub fn register_urlhandler(_extra_args: Option<&str>) -> io::Result<()> {
  Ok(())
}

#[cfg(target_os = "windows")]
pub fn register_urlhandler(extra_args: Option<&str>) -> io::Result<()> {
  // This is used both by initial registration and OS-invoked reinstallation.
  // The expectations for the latter are documented here: https://docs.microsoft.com/en-us/windows/win32/shell/reg-middleware-apps#the-reinstall-command
  use winreg::{enums::*, RegKey};
  use std::env::current_exe;

  const PROGID_PATH: &str = r"SOFTWARE\Classes\tondevwallet";
  const DISPLAY_NAME: &str = "tondevwallet";

  let exe_path = current_exe()?;
  let exe_path = exe_path.to_str().unwrap_or_default().to_owned();
  let icon_path = format!("\"{}\",0", exe_path);
  let open_command = if let Some(extra_args) = extra_args {
      format!("\"{}\" {} \"%1\"", exe_path, extra_args)
  } else {
      format!("\"{}\" \"--url=%1\"", exe_path)
  };

  let hkcu = RegKey::predef(HKEY_CURRENT_USER);

  // Configure our ProgID to point to the right command
  {
      let empty: &str = "";

      let (progid_class, _) = hkcu.create_subkey(PROGID_PATH)?;
      progid_class.set_value("", &DISPLAY_NAME)?;
      progid_class.set_value("URL Protocol", &empty)?;

      let (progid_class_defaulticon, _) = progid_class.create_subkey("DefaultIcon")?;
      progid_class_defaulticon.set_value("", &icon_path)?;

      let (progid_class_shell_open_command, _) =
          progid_class.create_subkey(r"shell\open\command")?;
      progid_class_shell_open_command.set_value("", &open_command)?;
  }

  Ok(())
}
