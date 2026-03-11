/**
 * OrderCreateForm -- Modal form for manual order creation and editing.
 *
 * Collects customer info, line items, shipping address, notes, and financials.
 * Create mode: Submits to POST /api/orders with CreateOrderInput body.
 * Edit mode: Submits to PATCH /api/orders/:id with UpdateOrderInput body.
 *
 * Phase 59: v1.x Feature Parity Audit (Plan 01, Task 1)
 */

import { useState, useCallback, useMemo } from 'react';
import type { OrderSource, OrderAddress, OrderWithDetails } from './types';
import ProductPicker from './ProductPicker';
import type { PickedProduct } from './ProductPicker';
import './OrderCreateForm.css';

/** A line item in the form (before submission). */
interface FormLineItem {
  productName: string;
  vendorStyle: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  vendor?: 'sanmar' | 'ss';
  imageUrl?: string | null;
  notes?: string;
}

interface OrderCreateFormProps {
  onCreated: (order: unknown) => void;
  onCancel: () => void;
  /** If provided, the form operates in edit mode for this order. */
  editOrder?: OrderWithDetails;
}

const EMPTY_ITEM: FormLineItem = {
  productName: '',
  vendorStyle: '',
  color: '',
  size: '',
  quantity: 1,
  unitPrice: 0,
};

const EMPTY_ADDRESS: OrderAddress = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  company: '',
};

function OrderCreateForm({ onCreated, onCancel, editOrder }: OrderCreateFormProps) {
  const isEditMode = Boolean(editOrder);

  // Source
  const [source, setSource] = useState<OrderSource | ''>(editOrder?.source ?? 'manual');

  // Customer info
  const [firstName, setFirstName] = useState(editOrder?.customerFirstName ?? '');
  const [lastName, setLastName] = useState(editOrder?.customerLastName ?? '');
  const [email, setEmail] = useState(editOrder?.customerEmail ?? '');
  const [phone, setPhone] = useState(editOrder?.customerPhone ?? '');

  // Shipping address
  const [showAddress, setShowAddress] = useState(Boolean(editOrder?.shippingAddress));
  const [address, setAddress] = useState<OrderAddress>(
    editOrder?.shippingAddress ? { ...EMPTY_ADDRESS, ...editOrder.shippingAddress } : { ...EMPTY_ADDRESS }
  );

  // Line items
  const [items, setItems] = useState<FormLineItem[]>(
    editOrder?.items?.length
      ? editOrder.items.map((it) => ({
          productName: it.productName,
          vendorStyle: it.vendorStyle ?? '',
          color: it.color ?? '',
          size: it.size ?? '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vendor: (it.vendor as 'sanmar' | 'ss') || undefined,
          imageUrl: it.imageUrl,
          notes: it.notes,
        }))
      : [{ ...EMPTY_ITEM }]
  );

  // Notes
  const [notes, setNotes] = useState(editOrder?.notes ?? '');

  // Financials (editable overrides)
  const [shippingCost, setShippingCost] = useState(editOrder?.shippingCost ?? 0);
  const [tax, setTax] = useState(editOrder?.tax ?? 0);
  const [discount, setDiscount] = useState(editOrder?.discount ?? 0);

  // Product picker
  const [showPicker, setShowPicker] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed subtotal
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items],
  );

  // Computed total
  const total = useMemo(
    () => subtotal + shippingCost + tax - discount,
    [subtotal, shippingCost, tax, discount],
  );

  // Line item handlers
  const updateItem = useCallback((index: number, field: keyof FormLineItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Handle product picker selection
  const handlePick = useCallback((product: PickedProduct) => {
    const newItem: FormLineItem = {
      productName: product.productName,
      vendorStyle: product.vendorStyle,
      color: product.color,
      size: product.size,
      quantity: 1,
      unitPrice: product.unitPrice,
      vendor: product.vendor,
      imageUrl: product.imageUrl,
    };
    setItems((prev) => [...prev, newItem]);
    setShowPicker(false);
  }, []);

  // Address field handler
  const updateAddress = useCallback((field: keyof OrderAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Validation
  const validate = useCallback((): string | null => {
    if (!source) return 'Source is required';
    if (items.length === 0) return 'At least one line item is required';
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productName.trim()) return `Item ${i + 1}: Product name is required`;
      if (items[i].quantity < 1) return `Item ${i + 1}: Quantity must be at least 1`;
    }
    return null;
  }, [source, items]);

  // Submit
  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    // Build shipping address if section is open and has data
    let shippingAddress: OrderAddress | undefined;
    if (showAddress && address.addressLine1.trim()) {
      shippingAddress = { ...address };
    }

    const body = {
      source: source as OrderSource,
      customerFirstName: firstName || undefined,
      customerLastName: lastName || undefined,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      shippingAddress,
      notes: notes || undefined,
      subtotal: Math.round(subtotal * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      items: items.map((it) => ({
        productName: it.productName,
        vendorStyle: it.vendorStyle || undefined,
        color: it.color || undefined,
        size: it.size || undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: Math.round(it.quantity * it.unitPrice * 100) / 100,
        vendor: it.vendor || undefined,
        imageUrl: it.imageUrl || undefined,
        notes: it.notes || undefined,
      })),
    };

    try {
      const url = isEditMode ? `/api/orders/${editOrder!.id}` : '/api/orders';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error: ${res.status}`);
      }

      const order = await res.json();
      onCreated(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [validate, source, firstName, lastName, email, phone, showAddress, address, notes, subtotal, shippingCost, tax, discount, total, items, onCreated, isEditMode, editOrder]);

  return (
    <div className="order-create-form__overlay" onClick={onCancel}>
      <div className="order-create-form" onClick={(e) => e.stopPropagation()}>
        <div className="order-create-form__header">
          <h2 className="order-create-form__title">{isEditMode ? `Edit Order #${editOrder!.orderNumber}` : 'New Order'}</h2>
          <button
            className="order-create-form__close-btn"
            onClick={onCancel}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="order-create-form__body">
          {/* Error message */}
          {error && (
            <div className="order-create-form__error">{error}</div>
          )}

          {/* Source */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">Source</legend>
            <select
              className="order-create-form__select"
              value={source}
              onChange={(e) => setSource(e.target.value as OrderSource)}
            >
              <option value="manual">Manual</option>
              <option value="wix">WIX</option>
            </select>
          </fieldset>

          {/* Customer Info */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">Customer Info</legend>
            <div className="order-create-form__row">
              <div className="order-create-form__field">
                <label className="order-create-form__label">First Name</label>
                <input
                  className="order-create-form__input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="order-create-form__field">
                <label className="order-create-form__label">Last Name</label>
                <input
                  className="order-create-form__input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="order-create-form__row">
              <div className="order-create-form__field">
                <label className="order-create-form__label">Email</label>
                <input
                  className="order-create-form__input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
              <div className="order-create-form__field">
                <label className="order-create-form__label">Phone</label>
                <input
                  className="order-create-form__input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                />
              </div>
            </div>
          </fieldset>

          {/* Shipping Address (collapsible) */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">
              <button
                type="button"
                className="order-create-form__toggle-btn"
                onClick={() => setShowAddress(!showAddress)}
              >
                {showAddress ? '▾' : '▸'} Shipping Address
              </button>
            </legend>
            {showAddress && (
              <div className="order-create-form__address-grid">
                <div className="order-create-form__field order-create-form__field--full">
                  <label className="order-create-form__label">Company</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.company || ''}
                    onChange={(e) => updateAddress('company', e.target.value)}
                    placeholder="Company"
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">First Name</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.firstName}
                    onChange={(e) => updateAddress('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">Last Name</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.lastName}
                    onChange={(e) => updateAddress('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div className="order-create-form__field order-create-form__field--full">
                  <label className="order-create-form__label">Address Line 1</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.addressLine1}
                    onChange={(e) => updateAddress('addressLine1', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="order-create-form__field order-create-form__field--full">
                  <label className="order-create-form__label">Address Line 2</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.addressLine2 || ''}
                    onChange={(e) => updateAddress('addressLine2', e.target.value)}
                    placeholder="Apt, suite, etc."
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">City</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.city}
                    onChange={(e) => updateAddress('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">State</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.state}
                    onChange={(e) => updateAddress('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">Postal Code</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.postalCode}
                    onChange={(e) => updateAddress('postalCode', e.target.value)}
                    placeholder="Zip"
                  />
                </div>
                <div className="order-create-form__field">
                  <label className="order-create-form__label">Country</label>
                  <input
                    className="order-create-form__input"
                    type="text"
                    value={address.country}
                    onChange={(e) => updateAddress('country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Line Items */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">Line Items</legend>
            {items.map((item, idx) => (
              <div key={idx} className="order-create-form__item-card">
                {item.imageUrl && (
                  <img
                    className="order-create-form__item-thumb"
                    src={item.imageUrl}
                    alt={item.productName}
                  />
                )}
                <div className="order-create-form__item-fields">
                  <div className="order-create-form__item-header">
                    <span className="order-create-form__item-number">
                      Item {idx + 1}
                      {item.vendor && (
                        <span className={`order-create-form__vendor-badge order-create-form__vendor-badge--${item.vendor}`}>
                          {item.vendor === 'sanmar' ? 'SanMar' : 'S&S'}
                        </span>
                      )}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="order-create-form__remove-btn"
                        onClick={() => removeItem(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="order-create-form__row">
                    <div className="order-create-form__field order-create-form__field--grow">
                      <label className="order-create-form__label">Product Name *</label>
                      <input
                        className="order-create-form__input"
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                        placeholder="Product name"
                        required
                      />
                    </div>
                    <div className="order-create-form__field">
                      <label className="order-create-form__label">Vendor Style</label>
                      <input
                        className="order-create-form__input"
                        type="text"
                        value={item.vendorStyle}
                        onChange={(e) => updateItem(idx, 'vendorStyle', e.target.value)}
                        placeholder="Style #"
                      />
                    </div>
                  </div>
                  <div className="order-create-form__row order-create-form__row--quad">
                    <div className="order-create-form__field">
                      <label className="order-create-form__label">Color</label>
                      <input
                        className="order-create-form__input"
                        type="text"
                        value={item.color}
                        onChange={(e) => updateItem(idx, 'color', e.target.value)}
                        placeholder="Color"
                      />
                    </div>
                    <div className="order-create-form__field">
                      <label className="order-create-form__label">Size</label>
                      <input
                        className="order-create-form__input"
                        type="text"
                        value={item.size}
                        onChange={(e) => updateItem(idx, 'size', e.target.value)}
                        placeholder="Size"
                      />
                    </div>
                    <div className="order-create-form__field">
                      <label className="order-create-form__label">Qty *</label>
                      <input
                        className="order-create-form__input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="order-create-form__field">
                      <label className="order-create-form__label">Unit Price *</label>
                      <input
                        className="order-create-form__input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                  <div className="order-create-form__field order-create-form__field--full">
                    <label className="order-create-form__label">Production Notes</label>
                    <textarea
                      className="order-create-form__input"
                      rows={1}
                      value={item.notes || ''}
                      onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                      placeholder="e.g., Left chest logo, 3-color"
                    />
                  </div>
                  <div className="order-create-form__item-total">
                    Line Total: ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
            <div className="order-create-form__item-actions">
              <button
                type="button"
                className="order-create-form__add-item-btn"
                onClick={addItem}
              >
                + Add Item
              </button>
              <button
                type="button"
                className="order-create-form__browse-btn"
                onClick={() => setShowPicker(true)}
              >
                Browse Catalog
              </button>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">Notes</legend>
            <textarea
              className="order-create-form__textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order notes (optional)"
              rows={3}
            />
          </fieldset>

          {/* Financials */}
          <fieldset className="order-create-form__section">
            <legend className="order-create-form__legend">Financials</legend>
            <div className="order-create-form__financials">
              <div className="order-create-form__financial-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="order-create-form__financial-row">
                <label className="order-create-form__financial-label">Shipping</label>
                <input
                  className="order-create-form__input order-create-form__input--money"
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="order-create-form__financial-row">
                <label className="order-create-form__financial-label">Tax</label>
                <input
                  className="order-create-form__input order-create-form__input--money"
                  type="number"
                  min={0}
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="order-create-form__financial-row">
                <label className="order-create-form__financial-label">Discount</label>
                <input
                  className="order-create-form__input order-create-form__input--money"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
              <div className="order-create-form__financial-row order-create-form__financial-row--total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Footer actions */}
        <div className="order-create-form__footer">
          <button
            type="button"
            className="order-create-form__cancel-btn"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="order-create-form__submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Order')}
          </button>
        </div>
      </div>
      {showPicker && (
        <ProductPicker
          onPick={handlePick}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default OrderCreateForm;
