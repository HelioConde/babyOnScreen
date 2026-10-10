/* Minimal ZIP (STORE) writer for exporting edited PNGs as a single archive.
   Uses no external libraries or network services; original repository paths are kept. */
(function (global) {
  "use strict";
  const encoder = new TextEncoder();
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : crc >>> 1;
    table[i] = crc >>> 0;
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++)
      crc = table[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function archivePath(path) {
    if (typeof path !== "string") throw new Error("Caminho inválido");
    const value = path.replace(/^\.\.\//, "");
    if (!/^assets\/sprites\/generated\/(?:alimentacao|banho|casa|crescimento|escola|fralda|npcs|quarto|quintal|sono)\/(?:element_\d{3}\.png|sheet\.png|crawl_sheet\.webp)$/.test(value))
      throw new Error("Caminho não permitido no pacote: " + path);
    return value;
  }
  function entryInfo(path) {
    const original = archivePath(path);
    const changedFormat = original.endsWith(".webp");
    return {
      sourcePath: original,
      exportPath: changedFormat ? original.replace(/\.webp$/, "_editado.png") : original,
      requiresManifestUpdate: changedFormat
    };
  }
  function dosDateTime(date) {
    const d = date instanceof Date && !isNaN(date) ? date : new Date();
    const year = Math.max(1980, Math.min(2107, d.getFullYear()));
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((Math.floor(d.getSeconds() / 2)) & 31),
      date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }
  function localHeader(name, size, crc, stamp) {
    const bytes = new Uint8Array(30 + name.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true); // UTF-8 file names
    view.setUint16(8, 0, true); // STORE, no compression; PNG is compressed already
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
    bytes.set(name, 30);
    return bytes;
  }
  function centralHeader(name, size, crc, stamp, offset) {
    const bytes = new Uint8Array(46 + name.length);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, stamp.time, true);
    view.setUint16(14, stamp.date, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, name.length, true);
    view.setUint32(42, offset, true);
    bytes.set(name, 46);
    return bytes;
  }
  async function createZip(files) {
    if (!Array.isArray(files) || !files.length || files.length > 1000)
      throw new Error("O pacote precisa ter entre 1 e 1000 arquivos");
    const chunks = [], central = [], used = new Set();
    let offset = 0, centralSize = 0;
    const stamp = dosDateTime(new Date());
    for (const item of files) {
      if (!item || typeof item.name !== "string" || !item.name ||
          item.name.startsWith("/") || item.name.includes("\\") ||
          item.name.split("/").some(s => !s || s === "." || s === ".."))
        throw new Error("Nome de arquivo inválido");
      if (used.has(item.name)) throw new Error("Arquivo duplicado no pacote: " + item.name);
      used.add(item.name);
      const encoded = encoder.encode(item.name);
      if (encoded.length > 65535) throw new Error("Nome de arquivo longo demais");
      const bytes = item.blob instanceof Blob
        ? new Uint8Array(await item.blob.arrayBuffer())
        : (item.bytes instanceof Uint8Array ? item.bytes : encoder.encode(String(item.text ?? "")));
      if (bytes.length > 0xffffffff) throw new Error("Arquivo grande demais para ZIP clássico");
      const checksum = crc32(bytes);
      const header = localHeader(encoded, bytes.length, checksum, stamp);
      const directory = centralHeader(encoded, bytes.length, checksum, stamp, offset);
      chunks.push(header, bytes);
      central.push(directory);
      centralSize += directory.length;
      offset += header.length + bytes.length;
      if (offset + centralSize >= 0xffffffff) throw new Error("Pacote grande demais");
    }
    const end = new Uint8Array(22);
    const view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, end], { type: "application/zip" });
  }
  global.BabySpriteZip = Object.freeze({ crc32, archivePath, entryInfo, createZip });
})(typeof window !== "undefined" ? window : globalThis);
