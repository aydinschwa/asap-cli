import fs from "fs/promises"
import path from "path"
import yargs from "yargs";
import {hideBin} from "yargs/helpers"
import {tmpdir} from "node:os"
import uuid from "uuid"
import archiver from "archiver"

// pass it a build dir
// zips up the dir and sends it to asap_site
const zipDir = async (filePath: string) => {
    filePath = path.resolve(filePath)
    const stat = await fs.lstat(filePath)

    if (!stat.isDirectory()) {
        console.log(`Must supply a directory! Rejecting ${filePath}`)
    }

    const zippedFilePath = await fs.mkdtemp(path.join(tmpdir(), "asap_site_"))
    let zippedFile = await fs.open(path.join(zippedFilePath, "archive.zip"))
    let ws = zippedFile.createWriteStream()

    const zipTool = archiver('zip', { zlib: { level: 9 }});




    

}



yargs(hideBin(process.argv))
.command(
    "deploy [filePath]",
    "deploys to asap_site",
    (yargs) => yargs.positional("filePath", {
        description: "Optional path to the directory",
        type: "string"
    }),
    (argv) => zipDir(argv.filePath || process.cwd()) 
)
.parse()



