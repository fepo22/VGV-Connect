import { Readable } from "node:stream";
import { google } from "googleapis";

const driveConfigured = () => process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID;
const maxPhotoBytes = Number(process.env.MAX_PHOTO_BYTES || 5 * 1024 * 1024);

const parseDataUrl = (dataUrl) => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!match) throw new Error("Formato de imagen no válido");
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > maxPhotoBytes) throw new Error("La imagen supera el tamaño permitido");
  return { mimeType: match[1].toLowerCase(), buffer };
};

const credentials = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return undefined;
  return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
};

const uploadToDrive = async (dataUrl, fileName) => {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const auth = new google.auth.GoogleAuth({
    credentials: credentials(),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id,webViewLink",
  });

  return { url: file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view`, external: true, provider: "drive" };
};

export const uploadPhoto = async (dataUrl, fileName) => {
  if (driveConfigured()) return uploadToDrive(dataUrl, fileName);
  parseDataUrl(dataUrl);
  return { url: dataUrl, external: false, provider: "local" };
};