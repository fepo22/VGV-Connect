import { Readable } from "node:stream";
import { google } from "googleapis";

const configured = () => process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID;

export const uploadPhoto = async (dataUrl, fileName) => {
  if (!configured()) return { url: dataUrl, external: false };

  const [, encoded] = dataUrl.split(",");
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] },
    media: { mimeType: "image/jpeg", body: Readable.from(Buffer.from(encoded, "base64")) },
    fields: "id,webViewLink",
  });

  return { url: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`, external: true };
};