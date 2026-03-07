/**
 * LogoStep -- Wrapper that manages the logo step in the product creation flow.
 *
 * Renders LogoPlacementEditor with step header and navigation.
 * Supports "Skip Logo" (null config) and "Continue with Logo" (AngleOverlayConfig).
 *
 * Phase 48: Logo System
 */

import LogoPlacementEditor from './LogoPlacementEditor';
import type { AngleOverlayConfig } from './LogoPlacementEditor';
import type { PreviewData } from './StyleLookup';

interface LogoStepProps {
  previewData: PreviewData;
  selectedColors: string[];
  onComplete: (config: AngleOverlayConfig | null) => void;
  onBack: () => void;
  onManageLogos: () => void;
}

function LogoStep({
  previewData,
  selectedColors,
  onComplete,
  onBack,
  onManageLogos,
}: LogoStepProps) {
  return (
    <LogoPlacementEditor
      previewData={previewData}
      selectedColors={selectedColors}
      onComplete={onComplete}
      onBack={onBack}
      onManageLogos={onManageLogos}
    />
  );
}

export default LogoStep;
export type { AngleOverlayConfig };
