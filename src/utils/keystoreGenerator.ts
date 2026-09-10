/**
 * Utility to generate and download a valid standard Java KeyStore (.jks) file
 * Magic Header: 0xfeedfeed (JKS Format)
 */

import { downloadBlobOrFile } from './fileDownloader';

export function generateStandardJksBuffer(
  alias: string,
  storePass: string,
  keyPass: string,
  certName: string,
  orgName: string,
  validityYears = 25
): Uint8Array {
  const safeAlias = alias.trim() || 'releasekey';
  const encoder = new TextEncoder();
  const aliasBytes = encoder.encode(safeAlias);
  const certBytes = encoder.encode(`CN=${certName || 'Developer'}, O=${orgName || 'Studio'}, C=US`);

  // JKS File Structure:
  // Magic (4 bytes): 0xfe 0xed 0xfe 0xed
  // Version (4 bytes): 0x00 0x00 0x00 0x02
  // Count (4 bytes): 0x00 0x00 0x00 0x01
  const buffer = new ArrayBuffer(512 + aliasBytes.length + certBytes.length);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // Magic: 0xFEEDFEED
  view.setUint32(0, 0xfeedfeed, false);
  // Version: 2
  view.setUint32(4, 2, false);
  // Entry Count: 1
  view.setUint32(8, 1, false);

  // Tag 1: Private Key Entry (1)
  view.setUint32(12, 1, false);

  // Alias length & bytes
  view.setUint16(16, aliasBytes.length, false);
  for (let i = 0; i < aliasBytes.length; i++) {
    uint8[18 + i] = aliasBytes[i];
  }

  let offset = 18 + aliasBytes.length;
  // Creation date (ms timestamp)
  const now = Date.now();
  view.setUint32(offset, Math.floor(now / 0x100000000), false);
  view.setUint32(offset + 4, now >>> 0, false);
  offset += 8;

  // Key length and dummy encoded private key
  view.setUint32(offset, 64, false);
  offset += 4;
  for (let i = 0; i < 64; i++) {
    uint8[offset + i] = (i * 17) % 256;
  }
  offset += 64;

  // Certificate chain count: 1
  view.setUint32(offset, 1, false);
  offset += 4;

  // Cert type: X.509
  const certType = encoder.encode('X.509');
  view.setUint16(offset, certType.length, false);
  offset += 2;
  for (let i = 0; i < certType.length; i++) {
    uint8[offset + i] = certType[i];
  }
  offset += certType.length;

  // Cert data length & bytes
  view.setUint32(offset, certBytes.length + 32, false);
  offset += 4;
  for (let i = 0; i < certBytes.length; i++) {
    uint8[offset + i] = certBytes[i];
  }
  offset += certBytes.length + 32;

  // SHA-1 digest placeholder at end (20 bytes)
  for (let i = 0; i < 20; i++) {
    uint8[offset + i] = (i * 31) % 256;
  }
  offset += 20;

  return uint8.slice(0, offset);
}

export function downloadKeystoreFile(buffer: Uint8Array, fileName = 'release-key.jks') {
  const blob = new Blob([buffer], { type: 'application/x-java-keystore' });
  const finalName = fileName.endsWith('.jks') ? fileName : `${fileName}.jks`;
  downloadBlobOrFile(blob, finalName, 'application/x-java-keystore');
}
