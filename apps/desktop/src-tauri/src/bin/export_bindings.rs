use kaarjoo_lib::commands;
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

fn main() {
    let specta_builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::get_system_status,
        commands::profile_get,
        commands::profile_save,
        commands::profile_parse_and_extract,
        commands::profile_clear,
        commands::jobs_search,
        commands::jobs_get_all,
        commands::jobs_get,
        commands::matching_score_job,
        commands::matching_rank_all,
        commands::matching_record_feedback,
        commands::documents_tailor,
        commands::documents_export_pdf,
        commands::documents_export_docx,
        commands::applications_get_all,
        commands::applications_get,
        commands::applications_create,
        commands::applications_update_status,
        commands::applications_update_notes,
        commands::applications_execute_review,
        commands::applications_submit_reviewed,
        commands::settings_get_all,
        commands::settings_set,
        commands::settings_wipe_all_data,
    ]);

    specta_builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    println!("Successfully exported TypeScript bindings to ../src/bindings.ts");
}
