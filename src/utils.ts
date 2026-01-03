import axios from "axios";
import FormData from "form-data";
import fs from "fs/promises";
import fsSync from "fs";
import { once } from "events";
import os from "os";
import path from "path";
import { tmpdir } from "node:os";
import archiver from "archiver";

// Helper to manage the local config file
const getSiteListPath = () => path.join(os.homedir(), ".asap");

export const getSiteList = () => {
    const p = getSiteListPath();
    if (!fsSync.existsSync(p)) return {};
    return JSON.parse(fsSync.readFileSync(p, "utf-8"));
};

const updateSiteList = (tag: string, secret: string | null) => {
    const siteList = getSiteList();
    if (secret === null) {
        delete siteList[tag]; // Remove site if secret is null
    } else {
        siteList[tag] = secret;
    }
    fsSync.writeFileSync(getSiteListPath(), JSON.stringify(siteList), "utf-8");
};

export const zipDir = async (dirPath: string) => {
    dirPath = path.resolve(dirPath);

    const tempDir = await fs.mkdtemp(path.join(tmpdir(), "asap_site_"));
    const zipFilePath = path.join(tempDir, "archive.zip");
    const output = fsSync.createWriteStream(zipFilePath);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(dirPath, false, (entry) => {
        // skip uploading dotfiles
        if (entry.name.split("/").some((part) => part.startsWith("."))) {
            return false;
        }
        return entry;
    });
    archive.finalize();

    await once(output, "close");
    return zipFilePath;
};

export const uploadToAsapSite = async (zipFilePath: string, tag: string) => {
    const formData = new FormData();

    formData.append("zip", fsSync.createReadStream(zipFilePath));
    formData.append("tag", tag);

    try {
        const response = await axios.post(
            "https://asap-static.site/asap/upload_site",
            formData,
            { headers: formData.getHeaders() },
        );
        const message = response.data.message

        // save secret key for site to prove ownership
        updateSiteList(tag, response.data.site_secret)

        return message;
    } catch (error) {
        // 1. Check if it's an error from the server (e.g. 400 Bad Request)
        if (axios.isAxiosError(error) && error.response) {
            const serverMessage = error.response.data?.error
            if (error.response.data.site_secret) {
                updateSiteList(tag, error.response.data.site_secret);
            }
            throw new Error(serverMessage);
        }
        // 2. Otherwise re-throw the original error (network issues, etc)
        throw error;
    }

};

export const deleteFromAsapSite = async (tag: string) => {
    // search ~/.asap file for a tag that matches the one the user is trying to delete 
    const siteList = getSiteList()
    const authToken = siteList[tag]
    if (!authToken) {
        throw new Error("You don't have permission to delete this site!")
    }
    try {
        const response = await axios.post(
            "https://asap-static.site/asap/destroy_site",
            { "tag": tag },
            {
                headers: {
                    "Authorization": authToken
                }
            }
        )
        // Remove creds from local config after site is deleted
        updateSiteList(tag, null)
        return response.data.message
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data?.error || error.message);
        }
        throw error;
    }

}
