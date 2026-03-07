/**
 * Customer Module - Barrel Exports
 *
 * Phase 53: Customer & Royalty System
 */

// Types
export type {
  CustomerAccount,
  CustomerPricingSummary,
  RoyaltyLineItem,
  RoyaltyReport,
  CreateCustomerInput,
  UpdateCustomerInput,
} from './types.js';

// Store operations
export {
  listCustomers,
  getCustomer,
  getCustomerByName,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} from './store.js';
