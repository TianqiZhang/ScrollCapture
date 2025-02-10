import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateIcons() {
  const sizes = [16, 48, 128];
  const iconDir = join(__dirname, '../dist/icons');
  
  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }

  // Generate icons for each size
  for (const size of sizes) {
    await sharp(join(__dirname, '../public/icon.svg'))
      .resize(size, size)
      .png()
      .toFile(join(iconDir, `icon${size}.png`));
  }
}

generateIcons().catch(console.error);