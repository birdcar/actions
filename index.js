const { join } = require('path');
const fs = require('fs/promises');
const ncc = require("@vercel/ncc");

async function main() {
  try {
    const files = await fs.readdir(__dirname);
    for (const file of files) {
      const stats = await fs.stat(file);
      if (stats.isDirectory() && ['node_modules', '.github'].every(r => r != file)) {
        const input = join(__dirname, file, 'index.js');
        console.info(`Compiling ${input}`)
        const outputDir = join(__dirname, file, 'dist');
        const opts = { sourceMap: true, sourceMapRegister: true };
        const { code, map, assets } = await ncc(input, opts);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(join(outputDir, `index.js`), code);
        await fs.writeFile(join(outputDir, `index.js.map`), map);
        for (const [assetName, assetValue] of Object.entries(assets)) {
          await fs.writeFile(join(outputDir, assetName), assetValue);
        }
      }
    }
    return `Success! All actions have been compiled.`;
  } catch (err) {
    console.log(err);
  }
}

main().then(console.log).catch(console.error)
