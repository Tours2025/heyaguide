import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function resizeAll() {
  const dirs = [
    'public/places/hagia-sophia',
    'public/places/blue-mosque',
    'public/places/basilica-cistern',
    'public/places/spice-bazaar',
    'public/places/maidens-tower',
  ];
  for (const dir of dirs) {
    try {
      const files = await readdir(dir);
      for (const f of files) {
        if (!f.endsWith('.jpg') && !f.endsWith('.jpeg')) continue;
        const src = join(dir, f);
        const meta = await sharp(src).metadata();
        if (meta.width > 2000 || (meta.format !== 'jpeg')) {
          const tmp = src + '.tmp.jpg';
          await sharp(src).resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toFile(tmp);
          await import('fs/promises').then(fs => fs.rename(tmp, src));
          const newMeta = await sharp(src).metadata();
          console.log(`Resized ${src}: ${meta.width}x${meta.height} -> ${newMeta.width}x${newMeta.height}`);
        }
      }
    } catch (e) {
      console.error(`Error in ${dir}: ${e.message}`);
    }
  }
}
resizeAll().catch(console.error);
