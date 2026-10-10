'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { TextEncoder } = require('node:util');

const ctx = { TextEncoder, Blob, Uint8Array, Uint32Array, DataView, Date };
ctx.window = ctx;
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../web/sprite-zip.js'), 'utf8'),
  ctx, { filename: 'sprite-zip.js' });
const Zip = ctx.BabySpriteZip;
function scanZip(blobBytes) {
  const buffer = Buffer.from(blobBytes);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const eocd = buffer.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let centralOffset = view.getUint32(eocd + 16, true);
  const items = [];
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(centralOffset, true), 0x02014b50);
    const len = view.getUint16(centralOffset + 28, true);
    const name = buffer.subarray(centralOffset + 46, centralOffset + 46 + len).toString('utf8');
    const locOffset = view.getUint32(centralOffset + 42, true);
    assert.equal(view.getUint32(locOffset, true), 0x04034b50);
    assert.equal(view.getUint16(locOffset + 8, true), 0, 'PNG should be stored without recompressing');
    const localNameLength = view.getUint16(locOffset + 26, true);
    const size = view.getUint32(locOffset + 18, true);
    const dataStart = locOffset + 30 + localNameLength;
    const data = buffer.subarray(dataStart, dataStart + size);
    assert.equal(view.getUint32(locOffset + 14, true), Zip.crc32(data));
    items.push({ name, data });
    centralOffset += 46 + len;
  }
  return items;
}
test('ZIP export keeps all edited PNGs and their GitHub category paths', async () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);
  const files = [
    { name: 'assets/sprites/generated/crescimento/element_001.png', blob: new Blob([png], { type: 'image/png' }) },
    { name: 'assets/sprites/generated/sono/element_007.png', blob: new Blob([png], { type: 'image/png' }) },
    { name: 'sprite-edits-manifest.json', text: JSON.stringify({ total: 2, changes: [] }) }
  ];
  const blob = await Zip.createZip(files);
  assert.equal(blob.type, 'application/zip');
  const rows = scanZip(await blob.arrayBuffer());
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(x => x.name), files.map(x => x.name));
  assert.deepEqual(rows[0].data, png);
  assert.deepEqual(rows[1].data, png);
  assert.equal(JSON.parse(rows[2].data.toString('utf8')).total, 2);
  assert.equal(Zip.crc32(Buffer.from('123456789')), 0xcbf43926);
});
test('archive prevents malicious or duplicate paths', async () => {
  assert.throws(() => Zip.archivePath('../../other/file.png'));
  assert.throws(() => Zip.archivePath('../assets/sprites/generated/sono/../../other.png'));
  assert.equal(Zip.entryInfo('../assets/sprites/generated/banho/element_001.png').exportPath,
    'assets/sprites/generated/banho/element_001.png');
  const info = Zip.entryInfo('../assets/sprites/generated/crescimento/crawl_sheet.webp');
  assert.equal(info.exportPath, 'assets/sprites/generated/crescimento/crawl_sheet_editado.png');
  assert.equal(info.requiresManifestUpdate, true);
  await assert.rejects(Zip.createZip([{ name: '../evil.png', text: 'x' }]));
  await assert.rejects(Zip.createZip([{ name: 'a.png', text: 'a' }, { name: 'a.png', text: 'b' }]));
});
