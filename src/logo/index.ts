/**
 * Logo System Module
 *
 * Barrel export for logo management, overlay compositing, and upload processing.
 *
 * Phase 48: Logo System
 */

// Types
export type {
  LogoPosition,
  LogoOverlayConfig,
  AngleOverlayConfig,
  LogoRegistryEntry,
  LogoRegistry,
} from './types.js';

// Registry
export {
  setDataDir,
  loadLogoRegistry,
  saveLogoRegistry,
  getLogoEntry,
  getPositionPreset,
  listLogos,
  listPositionPresets,
  addLogo,
  updateLogo,
  removeLogo,
  resolveLogoPath,
} from './registry.js';

// Overlay
export {
  compositeLogoOnImage,
  overlayProductImages,
  overlayProductImagesByAngle,
} from './overlay.js';

// Upload
export {
  setUploadDataDir,
  processLogoUpload,
} from './upload.js';
