use specta_typescript::{BigIntExportBehavior, Typescript};

fn main() {
    let specta_builder = kaarjoo_lib::specta_builder();

    let bindings_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/bindings.ts");
    specta_builder
        .export(
            Typescript::default().bigint(BigIntExportBehavior::Number),
            &bindings_path,
        )
        .expect("Failed to export typescript bindings");

    println!("Successfully exported TypeScript bindings to {}", bindings_path.display());
}
