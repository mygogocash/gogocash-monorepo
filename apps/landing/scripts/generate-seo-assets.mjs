import sharp from "sharp";
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, "..", "public", "images");
mkdirSync(imagesDir, { recursive: true });

const brand = { r: 16, g: 185, b: 129 };

/** OG image for link previews is `public/images/gogocash-social-preview.jpg` (committed). */

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { ...brand, alpha: 1 },
  },
})
  .png()
  .toFile(join(imagesDir, "gogocash-logo.png"));

/** Must match `LINE_MINI_APP_HREF` in components/social-data.ts */
const lineMiniAppUrl = "https://miniapp.line.me/2008237918-mpplkp5Q";

const qrLinePng = await QRCode.toBuffer(lineMiniAppUrl, {
  type: "png",
  width: 400,
  margin: 2,
  color: { dark: "#1f2937ff", light: "#ffffffff" },
});
await sharp(qrLinePng)
  .flatten({ background: "#ffffff" })
  .webp({ quality: 90 })
  .toFile(join(imagesDir, "qr-gogocash-line-miniapp.webp"));

console.log(
  "Wrote public/images/gogocash-logo.png, qr-gogocash-line-miniapp.webp (OG: gogocash-social-preview.jpg is hand-maintained)",
);
