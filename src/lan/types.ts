/**
 * Types for LAN network discovery and mDNS advertisement.
 */

/** Network information for the HotBox appliance on the local network. */
export interface NetworkInfo {
  hostname: string;
  addresses: string[];
  port: number;
  mdnsName: string;
  accessUrls: string[];
}

/** mDNS service advertisement descriptor. */
export interface MdnsServiceInfo {
  name: string;
  type: string; // '_http._tcp'
  port: number;
  host: string;
  txt: Record<string, string>;
}
