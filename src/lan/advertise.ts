/**
 * mDNS service advertisement using bonjour-service.
 * Publishes the HotBox HTTP service so devices on the LAN can discover it.
 */

import { Bonjour } from 'bonjour-service';

/**
 * Start advertising the HotBox service via mDNS (Bonjour).
 *
 * @param port - The port the HTTP server is listening on.
 * @param serviceName - The service name to advertise (default: 'HotBox').
 * @returns The Bonjour instance (call stopAdvertisement to clean up).
 */
export function startAdvertisement(port: number, serviceName = 'HotBox'): Bonjour {
  const bonjour = new Bonjour();

  bonjour.publish({
    name: serviceName,
    type: 'http',
    port,
    txt: {
      path: '/',
      version: '2.0',
      type: 'hotbox-appliance',
    },
  });

  return bonjour;
}

/**
 * Stop mDNS advertisement and release resources.
 *
 * @param bonjour - The Bonjour instance returned by startAdvertisement.
 */
export function stopAdvertisement(bonjour: Bonjour): void {
  bonjour.destroy();
}
