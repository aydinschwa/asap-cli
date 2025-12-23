import fsSync from "fs";
import prompts from "prompts";
import { generate } from "random-words";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { uploadToAsapSite, zipDir } from "./utils";
import path from "path";

const asapDeploy = async (dirPath: string, tag: string) => {
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
                    console.log("\nDeploy cancelled");
                    process.exit(0);
                },
            },
        );

        tag = siteTag;

        console.log(
            `\n\x1b[1m\x1b[32m Starting deploy to https://${siteTag}.asap-static.site\x1b[0m\n`,
        );
    }

    let tempDir: string | null = null

    try {
        const zipFilePath = await zipDir(projectPath);
        tempDir = path.dirname(zipFilePath)

        console.log(`\x1b[36m→\x1b[0m Uploading to https://${tag}.asap-static.site...`);
        await uploadToAsapSite(zipFilePath, tag);

        console.log(`\n\x1b[32m\x1b[1m✓ Deploy successful!\x1b[0m\n`);
        console.log(`  \x1b[1mYour site is live at:\x1b[0m`);
        console.log(`  \x1b[36m\x1b[4mhttps://${tag}.asap-static.site\x1b[0m\n`);
    }
    catch (error) {
        console.error(`\n\x1b[31m✗ Deploy failed: ${error instanceof Error ? error.message : String(error)}\x1b[0m\n`);
        process.exit(1)
    }
    finally {
        if (tempDir) {
            try {
                fsSync.rmSync(tempDir, { recursive: true, force: true })
            }
            catch (error) {
                console.log(error)
            }
        }
    }

};

yargs(hideBin(process.argv))
    .scriptName("asap")
    .usage("$0 <command> [options]")
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
                }),
        (argv) => asapDeploy(argv.filePath || process.cwd(), argv.tag || ""),
    )
    .help("h")
    .alias("h", "help")
    .parse();