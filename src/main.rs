use clap::{Arg, Command, command};

fn main() {
    let matches = command!()
    .subcommand(
        Command::new("deploy")
            .about("")
            .arg(Arg::new("path")
            .required(false))
    )
    .get_matches();

    match matches.subcommand() {
        Some(("deploy", _)) => {
            println!("{:?}", matches);

        }
        _ => {
            println!("invalid arg!!")
        }
    };
}