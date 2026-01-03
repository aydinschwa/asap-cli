import fsSync from "fs";
import os from "os";
import prompts from "prompts";
import { generate } from "random-words";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { deleteFromAsapSite, uploadToAsapSite, zipDir, getSiteList } from "./utils";
import path from "path";
import pc from "picocolors";
import ora from "ora";
import boxen from "boxen";

const asapDeploy = async (dirPath: string, tag: string) => {
    // create a ~/.asap file if one doesn't exist 
    const siteListPath = path.join(os.homedir(), ".asap");
    if (!fsSync.existsSync(siteListPath)) {
        fsSync.writeFileSync(siteListPath, JSON.stringify({}), "utf-8");
    }

    const { projectPath } = await prompts({
        type: "text",
        name: "projectPath",
        message: "Project path:",
        initial: dirPath,
        validate: (value) => {
            if (!fsSync.existsSync(value)) return "Directory does not exist";
            if (!fsSync.lstatSync(value).isDirectory()) return "Must be a directory";
            return true;
        },
    });

    // let user pick subdomain name if they didn't specify a tag in the deploy command
    if (!tag) {
        const randomSubdomain = (generate({ exactly: 3 }) as string[]).join("-");
        const { siteTag } = await prompts(
            {
                type: "text",
                name: "siteTag",
                message: "What subdomain name do you want?",
                initial: randomSubdomain,
                validate: (value) => {
                    if (!value) return "Subdomain name is required";
                    if (!/^[a-z0-9-]+$/.test(value))
                        return "Only lowercase letters, numbers, and hyphens allowed";
                    return true;
                },
            },
            {
                onCancel: () => {
                    console.log(pc.yellow("\nDeploy cancelled"));
                    process.exit(0);
                },
            },
        );

        tag = siteTag;

        console.log(
            pc.green(`\nStarting deploy to https://${siteTag}.asap-static.site\n`),
        );
    }

    let tempDir: string | null = null
    const spinner = ora("Preparing upload...").start();

    try {
        const zipFilePath = await zipDir(projectPath);
        tempDir = path.dirname(zipFilePath)

        spinner.text = `Uploading to https://${tag}.asap-static.site...`;
        await uploadToAsapSite(zipFilePath, tag);

        spinner.succeed(pc.green("Deploy successful!"));

        console.log(
            boxen(
                `${pc.bold("Your site is live at:")}\n${pc.cyan(
                    `https://${tag}.asap-static.site`
                )}`,
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "green",
                }
            )
        );
    }
    catch (error) {
        spinner.fail(pc.red("Deploy failed"));
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(pc.red(`\nError: ${errorMessage}\n`));
        process.exit(1);
    }
    finally {
        if (tempDir) {
            try {
                fsSync.rmSync(tempDir, { recursive: true, force: true })
            }
            catch (error) {
                // Silent cleanup error
            }
        }
    }

};

const asapList = () => {
    const siteList = getSiteList();
    const sites = Object.keys(siteList);

    if (sites.length === 0) {
        console.log(boxen(pc.yellow("No sites deployed yet."), { padding: 1, borderStyle: "round", borderColor: "yellow" }));
        return;
    }

    console.log(boxen(
        pc.bold(pc.cyan("Your deployed sites:")) + "\n\n" +
        sites.map(site => `• https://${site}.asap-static.site`).join("\n"),
        {
            padding: 1,
            borderStyle: "round",
            borderColor: "cyan",
        }
    ));
};

const asapDestroy = async (tag: string) => {
    const spinner = ora(`Removing site https://${tag}.asap-static.site...`).start();
    try {
        await deleteFromAsapSite(tag);
        spinner.succeed(pc.green("Site removed successfully!"));
    }
    catch (error) {
        spinner.fail(pc.red("Failed to remove site"));
        console.error(pc.red(`\nError: ${error} \n`));
        process.exit(1);
    }

}

yargs(hideBin(process.argv))
    .scriptName("asap")
    .usage(
        boxen(pc.bold(pc.cyan("ASAP CLI")) + "\nDeploy static sites instantly", {
            padding: 1,
            borderStyle: "round",
            borderColor: "cyan",
        }) + "\n\nUsage: $0 <command> [options]"
    )
    .command(
        ["deploy [filePath]", "$0 [filePath]"],
        "Deploy a static site to asap-static.site",
        (yargs: Argv) =>
            yargs
                .positional("filePath", {
                    describe: "Path to the directory to deploy",
                    type: "string",
                    default: ".",
                })
                .option("tag", {
                    alias: "t",
                    describe: "Subdomain name for your site",
                    type: "string",
                })
                .example("$0 deploy", "Deploy the current directory")
                .example("$0 deploy ./dist --tag my-site", "Deploy './dist' to my-site.asap-static.site"),
        (argv) => asapDeploy(argv.filePath || process.cwd(), argv.tag || ""),
    )
    .command(
        "list",
        "List all your deployed sites",
        () => { },
        () => asapList()
    )
    .command(
        "destroy [tag]",
        "Delete a site you own from asap-static.site",
        (yargs: Argv) =>
            yargs
                .positional("tag", {
                    describe: "Site to delete",
                    type: "string",
                    demandOption: true,
                })
                .example("$0 destroy my-site", "Delete my-site.asap-static.site"),
        (argv) => asapDestroy(argv.tag)
    )
    .help("h")
    .alias("h", "help")
    .epilogue(pc.dim("For more information, visit https://github.com/aydinschwa/asap-cli"))
    .parse();