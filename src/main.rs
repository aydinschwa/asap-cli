use std::fs::File;
use std::{env, path::PathBuf};

use clap::{Arg, Command, command};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::ZipWriter;
use zip_extensions::zip_writer_extensions::ZipWriterExtensions;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = command!()
        .subcommand(
            Command::new("deploy")
                .about("Deploys the current directory to asap.site")
                .arg(Arg::new("path").required(false)),
        )
        .get_matches();

    match matches.subcommand() {
        Some(("deploy", _)) => {
            println!("{:?}", matches);
            let source_path = env::current_dir()?;

            // store zipped folder in temp dir
            let temp_dir = env::temp_dir();
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let archive_file: PathBuf = temp_dir.join(format!("asap-deploy-{}.zip", timestamp));
            println!("{:?}", archive_file);
            let file = File::create(archive_file)?;
            let mut zip = ZipWriter::new(file);
            zip.create_from_directory(&source_path)?;
        }
        _ => {
            println!("invalid arg!!");
            return Ok(());
        }
    };
    Ok(())
}
