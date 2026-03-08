/**
 * Inventory monitoring types for the UI layer.
 *
 * Mirrors the server-side types from src/monitor/types.ts but
 * kept separate since UI runs in the browser and cannot import
 * server modules directly.
 *
 * Phase 57.1: Remaining Tab UIs (Plan 01)
 */

export type PollPriority = 'hot' | 'normal' | 'slow';

export type AlertType = 'out-of-stock' | 'critical' | 'low-stock' | 'back-in-stock';

export type VendorId = 'sanmar' | 'ssactivewear';

export interface TrackedProduct {
  id?: number;
  style: string;
  name: string;
  vendor: VendorId;
  colors?: string[];
  sizes?: string[];
  priority: PollPriority;
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
  outOfStockThreshold?: number;
  lastPolledAt?: string;
  addedAt: string;
}

export interface WarehouseQuantity {
  warehouseId: string;
  warehouseName: string;
  qty: number;
}

export interface SkuSnapshot {
  color: string;
  size: string;
  totalQty: number;
  wellStocked: boolean;
  warehouses?: WarehouseQuantity[];
}

export interface InventorySnapshot {
  style: string;
  timestamp: string;
  vendor: VendorId;
  skus: SkuSnapshot[];
}

export interface StockAlert {
  id: number;
  type: AlertType;
  style: string;
  productName: string;
  color: string;
  size: string;
  previousQty: number;
  currentQty: number;
  timestamp: string;
  vendor: VendorId;
  acknowledged: boolean;
}
