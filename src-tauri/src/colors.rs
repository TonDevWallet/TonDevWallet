#[cfg(target_os = "windows")]
use windows::UI::ViewManagement::{UIColorType, UIElementType, UISettings};

#[cfg(target_os = "macos")]
use core_graphics::base::CGFloat;
#[cfg(target_os = "macos")]
use objc::msg_send;
#[cfg(target_os = "macos")]
use objc_id::Id;

#[derive(serde::Serialize, Clone, Debug)]
pub struct SystemColorsList {
    background: Option<u64>,
    foreground: Option<u64>,
    accent_dark_3: Option<u64>,
    accent_dark_2: Option<u64>,
    accent_dark_1: Option<u64>,
    accent: Option<u64>,
    accent_light_1: Option<u64>,
    accent_light_2: Option<u64>,
    accent_light_3: Option<u64>,
    complement: Option<u64>,

    active_caption: Option<u64>,
    el_background: Option<u64>,
    button_face: Option<u64>,
    button_text: Option<u64>,
    caption_text: Option<u64>,
    gray_text: Option<u64>,
    highlight: Option<u64>,
    highlight_text: Option<u64>,
    hotlight: Option<u64>,
    inactive_caption: Option<u64>,
    inactive_caption_text: Option<u64>,
    window: Option<u64>,
    window_text: Option<u64>,
    accent_color: Option<u64>,
    text_high: Option<u64>,
    text_medium: Option<u64>,
    text_low: Option<u64>,
    text_contrast_with_high: Option<u64>,
    non_text_high: Option<u64>,
    non_text_medium_high: Option<u64>,
    non_text_medium: Option<u64>,
    non_text_medium_low: Option<u64>,
    non_text_low: Option<u64>,
    page_background: Option<u64>,
    popup_background: Option<u64>,
    overlay_outside_popup: Option<u64>,
}

#[cfg(target_os = "windows")]
fn rgba_to_u64(settings: UISettings, color_type: UIColorType) -> Option<u64> {
    //r: u8, g: u8, b: u8, a: u8) -> u64 {
    let c = match settings.GetColorValue(color_type) {
        Ok(v) => v,
        Err(_) => return None,
    };
    return Some(u64::from_be_bytes([0, 0, 0, 0, c.R, c.G, c.B, c.A]));
    // return ((u64{r}&0x0ff)<<24)|((g&0x0ff)<<16)|((b&0x0ff)<<8)|(a&0x0ff);
}

#[cfg(target_os = "windows")]
fn get_element_color(settings: UISettings, color_type: UIElementType) -> Option<u64> {
    let c = match settings.UIElementColor(color_type) {
        Ok(v) => v,
        Err(_) => return None,
    };
    return Some(u64::from_be_bytes([0, 0, 0, 0, c.R, c.G, c.B, c.A]));
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn get_system_colors() -> Result<SystemColorsList, String> {
    let settings = match UISettings::new() {
        Ok(v) => v,
        Err(e) => return Err(e.to_string()),
    };

    let list = SystemColorsList {
        background: rgba_to_u64(settings.clone(), UIColorType::Background),
        foreground: rgba_to_u64(settings.clone(), UIColorType::Foreground), // rgba_to_u64(settings.GetColorValue(UIColorType::Foreground).unwrap()),
        accent_dark_3: rgba_to_u64(settings.clone(), UIColorType::AccentDark3), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentDark3).unwrap()),
        accent_dark_2: rgba_to_u64(settings.clone(), UIColorType::AccentDark2), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentDark2).unwrap()),
        accent_dark_1: rgba_to_u64(settings.clone(), UIColorType::AccentDark1), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentDark1).unwrap()),
        accent: rgba_to_u64(settings.clone(), UIColorType::Accent), // rgba_to_u64(settings.GetColorValue(UIColorType::Accent).unwrap()),
        accent_light_1: rgba_to_u64(settings.clone(), UIColorType::AccentLight1), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentLight1).unwrap()),
        accent_light_2: rgba_to_u64(settings.clone(), UIColorType::AccentLight2), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentLight2).unwrap()),
        accent_light_3: rgba_to_u64(settings.clone(), UIColorType::AccentLight3), // rgba_to_u64(settings.GetColorValue(UIColorType::AccentLight3).unwrap()),
        // complement: rgba_to_u64(settings.GetColorValue(UIColorType::AccentLight3).unwrap()),
        complement: rgba_to_u64(settings.clone(), UIColorType::Complement),

        active_caption: get_element_color(settings.clone(), UIElementType::ActiveCaption),
        el_background: get_element_color(settings.clone(), UIElementType::Background),
        button_face: get_element_color(settings.clone(), UIElementType::ButtonFace),
        button_text: get_element_color(settings.clone(), UIElementType::ButtonText),
        caption_text: get_element_color(settings.clone(), UIElementType::CaptionText),
        gray_text: get_element_color(settings.clone(), UIElementType::GrayText),
        highlight: get_element_color(settings.clone(), UIElementType::Highlight),
        highlight_text: get_element_color(settings.clone(), UIElementType::HighlightText),
        hotlight: get_element_color(settings.clone(), UIElementType::Hotlight),
        inactive_caption: get_element_color(settings.clone(), UIElementType::InactiveCaption),
        inactive_caption_text: get_element_color(
            settings.clone(),
            UIElementType::InactiveCaptionText,
        ),
        window: get_element_color(settings.clone(), UIElementType::Window),
        window_text: get_element_color(settings.clone(), UIElementType::WindowText),
        accent_color: get_element_color(settings.clone(), UIElementType::AccentColor),
        text_high: get_element_color(settings.clone(), UIElementType::TextHigh),
        text_medium: get_element_color(settings.clone(), UIElementType::TextMedium),
        text_low: get_element_color(settings.clone(), UIElementType::TextLow),
        text_contrast_with_high: get_element_color(
            settings.clone(),
            UIElementType::TextContrastWithHigh,
        ),
        non_text_high: get_element_color(settings.clone(), UIElementType::NonTextHigh),
        non_text_medium_high: get_element_color(settings.clone(), UIElementType::NonTextMediumHigh),
        non_text_medium: get_element_color(settings.clone(), UIElementType::NonTextMedium),
        non_text_medium_low: get_element_color(settings.clone(), UIElementType::NonTextMediumLow),
        non_text_low: get_element_color(settings.clone(), UIElementType::NonTextLow),
        page_background: get_element_color(settings.clone(), UIElementType::PageBackground),
        popup_background: get_element_color(settings.clone(), UIElementType::PopupBackground),
        overlay_outside_popup: get_element_color(
            settings.clone(),
            UIElementType::OverlayOutsidePopup,
        ),
    };
    return Ok(list);
}

#[cfg(target_os = "linux")]
#[tauri::command]
pub fn get_system_colors() -> Result<SystemColorsList, String> {
    let list = SystemColorsList {
        background: None,
        foreground: None,
        accent_dark_3: None,
        accent_dark_2: None,
        accent_dark_1: None,
        accent: None,
        accent_light_1: None,
        accent_light_2: None,
        accent_light_3: None,
        // complement: rgba_to_u64(settings.GetColorValue(UIColorType::AccentLight3).unwrap()),
        complement: None,

        active_caption: None,
        el_background: None,
        button_face: None,
        button_text: None,
        caption_text: None,
        gray_text: None,
        highlight: None,
        highlight_text: None,
        hotlight: None,
        inactive_caption: None,
        inactive_caption_text: None,
        window: None,
        window_text: None,
        accent_color: None,
        text_high: None,
        text_medium: None,
        text_low: None,
        text_contrast_with_high: None,
        non_text_high: None,
        non_text_medium_high: None,
        non_text_medium: None,
        non_text_medium_low: None,
        non_text_low: None,
        page_background: None,
        popup_background: None,
        overlay_outside_popup: None,
    };
    return Ok(list);
}

#[cfg(target_os = "macos")]
fn nscolor_to_rgb(color: cacao::color::Color) -> u64 {
    let cg_color = color.cg_color();
    let color_id: cocoa::base::id =
        unsafe { msg_send![class!(CIColor), colorWithCGColor: cg_color] };
    let r: CGFloat = unsafe { msg_send![color_id, red] };
    let g: CGFloat = unsafe { msg_send![color_id, green] };
    let b: CGFloat = unsafe { msg_send![color_id, blue] };
    let a: CGFloat = unsafe { msg_send![color_id, alpha] };

    return u64::from_be_bytes([
        0,
        0,
        0,
        0,
        (r * 255.0) as u8,
        (g * 255.0) as u8,
        (b * 255.0) as u8,
        (a * 255.0) as u8,
    ]);
}
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_system_colors() -> Result<SystemColorsList, String> {
    let accent_color = unsafe { Id::from_ptr(msg_send![class!(NSColor), controlAccentColor]) };
    let accent_color_class =
        cacao::color::Color::Custom(std::sync::Arc::new(std::sync::RwLock::new(accent_color)));

    let list = SystemColorsList {
        background: None,
        foreground: Some(nscolor_to_rgb(cacao::color::Color::Label)),
        accent_dark_3: None,
        accent_dark_2: None,
        accent_dark_1: None,
        accent: Some(nscolor_to_rgb(accent_color_class)),
        accent_light_1: None,
        accent_light_2: None,
        accent_light_3: None,
        complement: None,

        active_caption: None,
        el_background: None,
        button_face: None,
        button_text: None,
        caption_text: None,
        gray_text: None,
        highlight: None,
        highlight_text: None,
        hotlight: None,
        inactive_caption: None,
        inactive_caption_text: None,
        window: None,
        window_text: None,
        accent_color: None,
        text_high: None,
        text_medium: None,
        text_low: None,
        text_contrast_with_high: None,
        non_text_high: None,
        non_text_medium_high: None,
        non_text_medium: None,
        non_text_medium_low: None,
        non_text_low: None,
        page_background: None,
        popup_background: None,
        overlay_outside_popup: None,
    };
    return Ok(list);
}
