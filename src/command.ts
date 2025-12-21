import axios from "axios";
import FormData from "form-data";
import fs from "fs/promises";
import fsSync from "fs";
import { once } from "events";
import path from "path";
import prompts from "prompts";
import { generate } from "random-words";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { tmpdir } from "node:os";
import archiver from "archiver";

const zipDir = async (dirPath: string) => {
    dirPath = path.resolve(dirPath);
    const stat = await fs.lstat(dirPath);

    if (!stat.isDirectory()) {
        console.log(`Must supply a directory! Rejecting ${dirPath}`);
    }

    const tempDir = await fs.mkdtemp(path.join(tmpdir(), "asap_site_"));
    const zipFilePath = path.join(tempDir, "archive.zip");
    const output = fsSync.createWriteStream(zipFilePath);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(dirPath, false);
    archive.finalize();

    await once(output, "close");
    return zipFilePath;
};

const uploadToAsapSite = async (zipFilePath: string, tag: string) => {
    const formData = new FormData();

    formData.append("zip", fsSync.createReadStream(zipFilePath));
    formData.append("tag", tag);

    const response = await axios.post(
        "https://asap-static.site/asap/upload_site",
        formData,
        {
            headers: formData.getHeaders(),
        },
    );
    const { message } = response.data;
    console.log(message);
    return message;
};

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
            `\n\x1b[1m\x1b[32m✓ Deploying to https://${siteTag}.asap-static.site\x1b[0m\n`,
        );
    }

    const zipFilePath = await zipDir(projectPath);
    await uploadToAsapSite(zipFilePath, tag);
};

yargs(hideBin(process.argv))
    .command(
        "deploy [filePath]",
        "deploys to asap_site",
        (yargs: Argv) =>
            yargs
                .positional("filePath", {
                    description: "Optional path to the directory",
                    type: "string",
                })
                .option("tag", {
                    alias: "t",
                    description: "Tag for the deployment",
                    type: "string",
                }),
        (argv) => asapDeploy(argv.filePath || process.cwd(), argv.tag || ""),
    )
    .parse();
