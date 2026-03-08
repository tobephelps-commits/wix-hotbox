/**
 * LAN module barrel — mDNS advertisement and network info.
 */

export type { NetworkInfo, MdnsServiceInfo } from './types.js';
export { startAdvertisement, stopAdvertisement } from './advertise.js';
export { getNetworkInfo } from './network-info.js';
