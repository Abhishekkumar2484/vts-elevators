const https = require('https');
const fs = require('fs');
const path = require('path');

const UNITS = [
  { name: 'Elevator Car B - North Wing', id: 'VTS-9921-X' },
  { name: 'Freight Lift - Block C', id: 'VTS-3312-F' },
  { name: 'Elevator Car A - South Wing', id: 'VTS-7741-A' },
  { name: 'Passenger Lift - Tower 2', id: 'VTS-5582-P' },
];

if (process.argv.length < 3) {
  console.error('Usage: node generate-qrs.js "PREFILL_URL_WITH_{UNIT_ID}"');
  console.error('Example: node generate-qrs.js "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.123456={UNIT_ID}"');
  process.exit(1);
}

const template = process.argv[2];
const outDir = path.join(__dirname, 'qrs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to fetch ' + url + ' - ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  console.log('Generating QR images into', outDir);
  for (const u of UNITS) {
    const filled = template.replace(/{UNIT_ID}/g, encodeURIComponent(u.id));
    // Use qrserver API which reliably returns PNG for arbitrary URLs
    const chartUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(filled)}`;
    const outPath = path.join(outDir, `${u.id}.png`);
    try {
      console.log('Fetching QR for', u.id, '->', chartUrl);
      await download(chartUrl, outPath);
      console.log('Saved', outPath);
    } catch (err) {
      console.error('Failed for', u.id, err.message);
    }
  }
  console.log('Done');
})();
