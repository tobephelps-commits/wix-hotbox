/**
 * Network information utilities for LAN access discovery.
 */

import { networkInterfaces, hostname } from 'node:os';
import type { NetworkInfo } from './types.js';

/**
 * Gather network information about the current machine.
 * Finds all non-internal IPv4 addresses and builds access URLs.
 *
 * @param port - The port the HTTP server is listening on.
 * @returns NetworkInfo with hostname, LAN addresses, and access URLs.
 */
export function getNetworkInfo(port: number): NetworkInfo {
  const host = hostname();
  const mdnsName = 'hotbox';
  const interfaces = networkInterfaces();
  const addresses: string[] = [];

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (!info.internal && info.family === 'IPv4') {
        addresses.push(info.address);
      }
    }
  }

  const accessUrls = addresses.map((addr) => `http://${addr}:${port}`);
  accessUrls.push(`http://${host}.local:${port}`);

  return {
    hostname: host,
    addresses,
    port,
    mdnsName,
    accessUrls,
  };
}
