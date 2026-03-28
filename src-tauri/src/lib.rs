mod db;
mod import;
mod commands;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
}

pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("finapp.db");
            let database = Database::new(&db_path).expect("Failed to initialize database");
            app.manage(AppState {
                db: Mutex::new(database),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::expenses::get_transactions,
            commands::expenses::add_transaction,
            commands::expenses::update_transaction,
            commands::expenses::delete_transaction,
            commands::analytics::get_monthly_spending,
            commands::analytics::get_yearly_spending,
            commands::analytics::get_category_breakdown,
            commands::analytics::get_subcategory_breakdown,
            commands::analytics::get_top_merchants,
            commands::analytics::get_key_metrics,
            commands::analytics::get_spending_by_member,
            commands::import::import_spreadsheet,
            commands::import::get_import_history,
            commands::settings::get_settings,
            commands::settings::update_setting,
            commands::settings::get_categories,
            commands::settings::get_data_quality_issues,
            commands::settings::resolve_data_quality_issue,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
