import * as dotenv from "dotenv";

dotenv.config();

export const whatsappConfig = {
  groupId: process.env.WHATSAPP_GROUP_ID || "",
  sessionPath: "./whatsapp-session",
  puppeteerOptions: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
  connectionTimeout: 60000,
  maxRetries: 3,
  retryDelay: 5000,
};
