import axios from "axios";
import FormData from "form-data";
import fs from "fs/promises";
import fsSync from "fs";
import { once } from "events";
import path from "path";
import { tmpdir } from "node:os";
import archiver from "archiver";

export const zipDir = async (dirPath: string) => {
    dirPath = path.resolve(dirPath);

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

export const uploadToAsapSite = async (zipFilePath: string, tag: string) => {
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
    return message;


};
