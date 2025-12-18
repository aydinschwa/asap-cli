import axios from "axios"
import FormData from "form-data"
import fs from "fs/promises"
import fsSync from "fs"
import {once} from "events"
import path from "path"
import yargs, {type Argv} from "yargs";
import {hideBin} from "yargs/helpers"
import {tmpdir} from "node:os"
import archiver from "archiver"

const zipDir = async (dirPath: string) => {
    dirPath = path.resolve(dirPath)
    const stat = await fs.lstat(dirPath)

    if (!stat.isDirectory()) {
        console.log(`Must supply a directory! Rejecting ${dirPath}`)
    }

    const tempDir = await fs.mkdtemp(path.join(tmpdir(), "asap_site_"))
    const zipFilePath = path.join(tempDir, "archive.zip")
    const output = fsSync.createWriteStream(zipFilePath)

    const archive = archiver('zip', { zlib: { level: 9 }});
    archive.pipe(output);
    archive.directory(dirPath, false);
    archive.finalize()

    await once(output, "close");
    return zipFilePath 
}

const uploadToAsapSite = async (zipFilePath: string, tag: string) => {
    const formData = new FormData()

    formData.append("zip", fsSync.createReadStream(zipFilePath))
    formData.append("tag", tag)

    const response = await axios.post("https://aydino.com/asap/upload_site", formData, 
        {
            headers: formData.getHeaders()
        }
    )
    console.log(response.data)

}

const asapDeploy = async (dirPath: string, tag: string) => {
    const zipFilePath = await zipDir(dirPath)
    await uploadToAsapSite(zipFilePath, tag)
}


yargs(hideBin(process.argv))
.command(
    "deploy [filePath]",
    "deploys to asap_site",
    (yargs: Argv) => yargs
    .positional("filePath", {
        description: "Optional path to the directory",
        type: "string"
    })
    .option("tag", {
        alias: "t",
        description: "Tag for the deployment",
        type: "string",
        demandOption: true
    }),
    (argv) => asapDeploy(argv.filePath || process.cwd(), argv.tag) 
)
.parse()



