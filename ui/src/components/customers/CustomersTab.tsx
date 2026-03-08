/**
 * CustomersTab -- Main customers tab with customer list, create/edit form,
 * pricing calculator, and royalty reporting.
 *
 * Master-detail layout: left panel (customer list with search/filter)
 * and right panel (customer detail/form when selected).
 *
 * Phase 57.1: Remaining Tab UIs (Plan 02)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CustomerAccount, PricingResult, RoyaltyReport } from './types';
import './CustomersTab.css';

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// =============================================================================
// Form state
// =============================================================================

interface CustomerFormData {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  markupPercent: string;
  royaltyPercent: string;
  logoKeys: string;
  notes: string;
  active: boolean;
}

const EMPTY_FORM: CustomerFormData = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  markupPercent: '',
  royaltyPercent: '',
  logoKeys: '',
  notes: '',
  active: true,
};

function customerToForm(c: CustomerAccount): CustomerFormData {
  return {
    name: c.name,
    contactName: c.contactName,
    email: c.email,
    phone: c.phone ?? '',
    markupPercent: String(c.markupPercent),
    royaltyPercent: String(c.royaltyPercent),
    logoKeys: c.logoKeys.join(', '),
    notes: c.notes ?? '',
    active: c.active,
  };
}

// =============================================================================
// CustomersTab Component
// =============================================================================

function CustomersTab() {
  // List state
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterActive, setFilterActive] = useState(true);
  const [search, setSearch] = useState('');

  // Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);

  // Mode state
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pricing calculator state
  const [pricingOpen, setPricingOpen] = useState(false);
  const [wholesaleCost, setWholesaleCost] = useState('');
  const [decorationCost, setDecorationCost] = useState('0');
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Royalty report state
  const [royaltyOpen, setRoyaltyOpen] = useState(false);
  const [royaltyDates, setRoyaltyDates] = useState(getDefaultDateRange);
  const [royaltyReport, setRoyaltyReport] = useState<RoyaltyReport | null>(null);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);

  // Debounce ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch customers list
  // ---------------------------------------------------------------------------

  const fetchCustomers = useCallback(async (activeOnly: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeOnly) params.set('active', 'true');
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch {
      // Network error -- keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers(filterActive);
  }, [fetchCustomers, filterActive]);

  // ---------------------------------------------------------------------------
  // Fetch single customer detail
  // ---------------------------------------------------------------------------

  const fetchCustomerDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data: CustomerAccount = await res.json();
        setSelectedCustomer(data);
      }
    } catch {
      // Network error
    }
  }, []);

  // When selectedCustomerId changes, fetch detail
  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
      setMode('view');
      setConfirmDelete(false);
      setPricingResult(null);
      setRoyaltyReport(null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, fetchCustomerDetail]);

  // ---------------------------------------------------------------------------
  // Filter customers by search (client-side)
  // ---------------------------------------------------------------------------

  const filteredCustomers = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
  }, []);

  const handleFilterToggle = useCallback(() => {
    setFilterActive((prev) => !prev);
  }, []);

  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
  }, []);

  const handleNewCustomer = useCallback(() => {
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setMode('create');
    setFormData(EMPTY_FORM);
    setFormError(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedCustomer) {
      setFormData(customerToForm(selectedCustomer));
      setMode('edit');
      setFormError(null);
    }
  }, [selectedCustomer]);

  const handleCancelForm = useCallback(() => {
    if (selectedCustomer) {
      setMode('view');
    } else {
      setMode('view');
      setSelectedCustomerId(null);
    }
    setFormError(null);
  }, [selectedCustomer]);

  const handleFormChange = useCallback((field: keyof CustomerFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    // Validate
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.contactName.trim()) {
      setFormError('Contact name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    const markup = parseFloat(formData.markupPercent);
    if (isNaN(markup) || markup < 0) {
      setFormError('Markup percent must be a non-negative number');
      return;
    }
    const royalty = parseFloat(formData.royaltyPercent);
    if (isNaN(royalty) || royalty < 0) {
      setFormError('Royalty percent must be a non-negative number');
      return;
    }

    setSaving(true);
    setFormError(null);

    const body = {
      name: formData.name.trim(),
      contactName: formData.contactName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      markupPercent: markup,
      royaltyPercent: royalty,
      logoKeys: formData.logoKeys
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      notes: formData.notes.trim() || undefined,
      active: formData.active,
    };

    try {
      if (mode === 'create') {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created: CustomerAccount = await res.json();
          await fetchCustomers(filterActive);
          setSelectedCustomerId(created.id);
          setMode('view');
        } else {
          const err = await res.json().catch(() => ({ error: 'Failed to create customer' }));
          setFormError(err.error || 'Failed to create customer');
        }
      } else {
        // Update
        const res = await fetch(`/api/customers/${selectedCustomerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchCustomers(filterActive);
          await fetchCustomerDetail(selectedCustomerId!);
          setMode('view');
        } else {
          const err = await res.json().catch(() => ({ error: 'Failed to update customer' }));
          setFormError(err.error || 'Failed to update customer');
        }
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, mode, selectedCustomerId, filterActive, fetchCustomers, fetchCustomerDetail]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!selectedCustomerId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
        setMode('view');
        setConfirmDelete(false);
        await fetchCustomers(filterActive);
      }
    } catch {
      // Network error
    } finally {
      setDeleting(false);
    }
  }, [selectedCustomerId, filterActive, fetchCustomers]);

  // ---------------------------------------------------------------------------
  // Pricing calculator
  // ---------------------------------------------------------------------------

  const handleCalculatePricing = useCallback(async () => {
    if (!selectedCustomerId) return;
    const wc = parseFloat(wholesaleCost);
    if (isNaN(wc) || wc < 0) return;
    const dc = parseFloat(decorationCost) || 0;

    setPricingLoading(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wholesaleCost: wc, decorationCost: dc }),
      });
      if (res.ok) {
        const data: PricingResult = await res.json();
        setPricingResult(data);
      }
    } catch {
      // Network error
    } finally {
      setPricingLoading(false);
    }
  }, [selectedCustomerId, wholesaleCost, decorationCost]);

  // ---------------------------------------------------------------------------
  // Royalty report
  // ---------------------------------------------------------------------------

  const handleGenerateRoyalty = useCallback(async () => {
    if (!selectedCustomerId) return;
    setRoyaltyLoading(true);
    try {
      const params = new URLSearchParams({
        start: royaltyDates.start,
        end: royaltyDates.end,
      });
      const res = await fetch(`/api/customers/${selectedCustomerId}/royalty?${params.toString()}`);
      if (res.ok) {
        const data: RoyaltyReport = await res.json();
        setRoyaltyReport(data);
      }
    } catch {
      // Network error
    } finally {
      setRoyaltyLoading(false);
    }
  }, [selectedCustomerId, royaltyDates]);

  const handleDownloadRoyaltyPdf = useCallback(() => {
    if (!selectedCustomerId) return;
    const params = new URLSearchParams({
      start: royaltyDates.start,
      end: royaltyDates.end,
    });
    window.open(`/api/customers/${selectedCustomerId}/royalty/pdf?${params.toString()}`, '_blank');
  }, [selectedCustomerId, royaltyDates]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showForm = mode === 'create' || mode === 'edit';

  return (
    <div className="customers-layout">
      {/* Left Panel: Customer List */}
      <div className="customers-layout__list-panel">
        <div className="customers-header">
          <h2 className="customers-header__title">Customers</h2>
          <button className="customers-header__new-btn" onClick={handleNewCustomer}>
            New Customer
          </button>
        </div>

        {/* Filter toggle */}
        <div className="customers-filters">
          <button
            className={`customers-filter-pill${filterActive ? ' customers-filter-pill--active' : ''}`}
            onClick={handleFilterToggle}
          >
            {filterActive ? 'Active' : 'All'}
          </button>
        </div>

        {/* Search */}
        <div className="customers-search">
          <input
            type="text"
            className="customers-search__input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Customer list */}
        <div className="customers-list">
          {loading && customers.length === 0 && (
            <div className="customers-empty">
              <div className="customers-empty__text">Loading customers...</div>
            </div>
          )}
          {!loading && filteredCustomers.length === 0 && (
            <div className="customers-empty">
              <div className="customers-empty__title">No customers found</div>
              <div className="customers-empty__text">
                {search ? 'Try a different search' : 'Create a new customer to get started'}
              </div>
            </div>
          )}
          {filteredCustomers.map((c) => (
            <button
              key={c.id}
              className={`customer-item${selectedCustomerId === c.id ? ' customer-item--selected' : ''}`}
              onClick={() => handleSelectCustomer(c.id)}
            >
              <div className="customer-item__main">
                <div className="customer-item__top">
                  <span className="customer-item__name">{c.name}</span>
                  <span className={`active-badge${c.active ? ' active-badge--active' : ' active-badge--inactive'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="customer-item__bottom">
                  <span className="customer-item__contact">{c.contactName}</span>
                  <span className="customer-item__email">{c.email}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Detail / Form */}
      <div className="customers-layout__detail-panel">
        {/* No selection, not creating */}
        {!selectedCustomer && !showForm && (
          <div className="customer-detail__empty">
            Select a customer or create a new one
          </div>
        )}

        {/* Create/Edit Form */}
        {showForm && (
          <div className="customer-detail">
            <div className="customer-detail__header">
              <h3 className="customer-detail__title">
                {mode === 'create' ? 'New Customer' : `Edit: ${selectedCustomer?.name}`}
              </h3>
            </div>

            {formError && (
              <div className="customer-form__error">{formError}</div>
            )}

            <div className="customer-form">
              <div className="customer-form__field">
                <label className="customer-form__label">Name *</label>
                <input
                  type="text"
                  className="customer-form__input"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Company / brand name"
                />
              </div>

              <div className="customer-form__field">
                <label className="customer-form__label">Contact Name *</label>
                <input
                  type="text"
                  className="customer-form__input"
                  value={formData.contactName}
                  onChange={(e) => handleFormChange('contactName', e.target.value)}
                  placeholder="Primary contact person"
                />
              </div>

              <div className="customer-form__field">
                <label className="customer-form__label">Email *</label>
                <input
                  type="email"
                  className="customer-form__input"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="customer-form__field">
                <label className="customer-form__label">Phone</label>
                <input
                  type="tel"
                  className="customer-form__input"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="customer-form__row">
                <div className="customer-form__field">
                  <label className="customer-form__label">Markup % *</label>
                  <input
                    type="number"
                    className="customer-form__input"
                    value={formData.markupPercent}
                    onChange={(e) => handleFormChange('markupPercent', e.target.value)}
                    placeholder="40"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div className="customer-form__field">
                  <label className="customer-form__label">Royalty % *</label>
                  <input
                    type="number"
                    className="customer-form__input"
                    value={formData.royaltyPercent}
                    onChange={(e) => handleFormChange('royaltyPercent', e.target.value)}
                    placeholder="5"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div className="customer-form__field">
                <label className="customer-form__label">Logo Keys</label>
                <input
                  type="text"
                  className="customer-form__input"
                  value={formData.logoKeys}
                  onChange={(e) => handleFormChange('logoKeys', e.target.value)}
                  placeholder="logo1, logo2 (comma-separated)"
                />
              </div>

              <div className="customer-form__field">
                <label className="customer-form__label">Notes</label>
                <textarea
                  className="customer-form__textarea"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Internal notes about this customer..."
                  rows={3}
                />
              </div>

              <div className="customer-form__field customer-form__field--checkbox">
                <label className="customer-form__checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleFormChange('active', e.target.checked)}
                  />
                  Active
                </label>
              </div>

              <div className="customer-form__actions">
                <button
                  className="customer-form__save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="customer-form__cancel-btn"
                  onClick={handleCancelForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Mode */}
        {selectedCustomer && mode === 'view' && (
          <div className="customer-detail">
            {/* Header */}
            <div className="customer-detail__header">
              <h3 className="customer-detail__title">{selectedCustomer.name}</h3>
              <span className={`active-badge${selectedCustomer.active ? ' active-badge--active' : ' active-badge--inactive'}`}>
                {selectedCustomer.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Actions */}
            <div className="customer-detail__actions">
              <button className="customer-detail__edit-btn" onClick={handleEdit}>
                Edit
              </button>
              {!confirmDelete ? (
                <button
                  className="customer-detail__delete-btn"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              ) : (
                <div className="customer-detail__delete-confirm">
                  <span>Delete this customer?</span>
                  <button
                    className="customer-detail__delete-confirm-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    className="customer-detail__delete-cancel-btn"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="customer-detail__section">
              <div className="customer-detail__section-title">Contact</div>
              <div className="customer-detail__card">
                <div className="customer-detail__field">
                  <span className="customer-detail__field-label">Contact</span>
                  <span className="customer-detail__field-value">{selectedCustomer.contactName}</span>
                </div>
                <div className="customer-detail__field">
                  <span className="customer-detail__field-label">Email</span>
                  <span className="customer-detail__field-value">{selectedCustomer.email}</span>
                </div>
                {selectedCustomer.phone && (
                  <div className="customer-detail__field">
                    <span className="customer-detail__field-label">Phone</span>
                    <span className="customer-detail__field-value">{selectedCustomer.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Info */}
            <div className="customer-detail__section">
              <div className="customer-detail__section-title">Pricing</div>
              <div className="customer-detail__card">
                <div className="customer-detail__pricing-row">
                  <div className="customer-detail__pricing-stat">
                    <span className="customer-detail__pricing-value">{selectedCustomer.markupPercent}%</span>
                    <span className="customer-detail__pricing-label">Markup</span>
                  </div>
                  <div className="customer-detail__pricing-stat">
                    <span className="customer-detail__pricing-value">{selectedCustomer.royaltyPercent}%</span>
                    <span className="customer-detail__pricing-label">Royalty</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logo Keys */}
            {selectedCustomer.logoKeys.length > 0 && (
              <div className="customer-detail__section">
                <div className="customer-detail__section-title">Logo Keys</div>
                <div className="customer-detail__card">
                  <div className="customer-detail__chips">
                    {selectedCustomer.logoKeys.map((key) => (
                      <span key={key} className="customer-detail__chip">{key}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedCustomer.notes && (
              <div className="customer-detail__section">
                <div className="customer-detail__section-title">Notes</div>
                <div className="customer-detail__card">
                  <div className="customer-detail__notes">{selectedCustomer.notes}</div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="customer-detail__section">
              <div className="customer-detail__timestamps">
                <span>Created: {formatDate(selectedCustomer.createdAt)}</span>
                <span>Updated: {formatDate(selectedCustomer.updatedAt)}</span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* Pricing Calculator */}
            {/* ============================================================= */}
            <div className="customer-detail__section">
              <button
                className="customer-detail__collapsible-header"
                onClick={() => setPricingOpen((prev) => !prev)}
              >
                <span className="customer-detail__section-title">Pricing Calculator</span>
                <span className="customer-detail__collapse-icon">{pricingOpen ? '\u25B2' : '\u25BC'}</span>
              </button>

              {pricingOpen && (
                <div className="customer-detail__card">
                  <div className="customer-form__row">
                    <div className="customer-form__field">
                      <label className="customer-form__label">Wholesale Cost</label>
                      <input
                        type="number"
                        className="customer-form__input"
                        value={wholesaleCost}
                        onChange={(e) => {
                          setWholesaleCost(e.target.value);
                          setPricingResult(null);
                        }}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="customer-form__field">
                      <label className="customer-form__label">Decoration Cost</label>
                      <input
                        type="number"
                        className="customer-form__input"
                        value={decorationCost}
                        onChange={(e) => {
                          setDecorationCost(e.target.value);
                          setPricingResult(null);
                        }}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <button
                    className="customer-detail__calc-btn"
                    onClick={handleCalculatePricing}
                    disabled={pricingLoading || !wholesaleCost}
                  >
                    {pricingLoading ? 'Calculating...' : 'Calculate'}
                  </button>

                  {pricingResult && (
                    <div className="customer-detail__pricing-results">
                      <div className="customer-detail__pricing-result-row">
                        <span>Total Cost</span>
                        <span>{formatCurrency(pricingResult.totalCost)}</span>
                      </div>
                      <div className="customer-detail__pricing-result-row">
                        <span>Markup ({selectedCustomer.markupPercent}%)</span>
                        <span>{formatCurrency(pricingResult.margin.dollars)}</span>
                      </div>
                      <div className="customer-detail__pricing-result-row customer-detail__pricing-result-row--highlight">
                        <span>Retail Price</span>
                        <span>{formatCurrency(pricingResult.retailPrice)}</span>
                      </div>
                      <div className="customer-detail__pricing-result-row">
                        <span>Royalty ({selectedCustomer.royaltyPercent}%)</span>
                        <span>{formatCurrency(pricingResult.royaltyPerUnit)}</span>
                      </div>
                      <div className="customer-detail__pricing-result-row">
                        <span>Net After Royalty</span>
                        <span>{formatCurrency(pricingResult.netAfterRoyalty)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* Royalty Report */}
            {/* ============================================================= */}
            <div className="customer-detail__section">
              <button
                className="customer-detail__collapsible-header"
                onClick={() => setRoyaltyOpen((prev) => !prev)}
              >
                <span className="customer-detail__section-title">Royalty Report</span>
                <span className="customer-detail__collapse-icon">{royaltyOpen ? '\u25B2' : '\u25BC'}</span>
              </button>

              {royaltyOpen && (
                <div className="customer-detail__card">
                  <div className="customer-form__row">
                    <div className="customer-form__field">
                      <label className="customer-form__label">Start Date</label>
                      <input
                        type="date"
                        className="customer-form__input"
                        value={royaltyDates.start}
                        onChange={(e) => setRoyaltyDates((prev) => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div className="customer-form__field">
                      <label className="customer-form__label">End Date</label>
                      <input
                        type="date"
                        className="customer-form__input"
                        value={royaltyDates.end}
                        onChange={(e) => setRoyaltyDates((prev) => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="customer-detail__royalty-actions">
                    <button
                      className="customer-detail__calc-btn"
                      onClick={handleGenerateRoyalty}
                      disabled={royaltyLoading}
                    >
                      {royaltyLoading ? 'Generating...' : 'Generate Report'}
                    </button>
                    <button
                      className="customer-detail__pdf-btn"
                      onClick={handleDownloadRoyaltyPdf}
                    >
                      Download PDF
                    </button>
                  </div>

                  {royaltyReport && (
                    <div className="customer-detail__royalty-report">
                      {/* Summary */}
                      <div className="customer-detail__royalty-summary">
                        <div className="customer-detail__royalty-stat">
                          <span className="customer-detail__royalty-stat-value">{royaltyReport.orderCount}</span>
                          <span className="customer-detail__royalty-stat-label">Orders</span>
                        </div>
                        <div className="customer-detail__royalty-stat">
                          <span className="customer-detail__royalty-stat-value">{royaltyReport.totalUnits}</span>
                          <span className="customer-detail__royalty-stat-label">Units</span>
                        </div>
                        <div className="customer-detail__royalty-stat">
                          <span className="customer-detail__royalty-stat-value">{formatCurrency(royaltyReport.totalRevenue)}</span>
                          <span className="customer-detail__royalty-stat-label">Revenue</span>
                        </div>
                        <div className="customer-detail__royalty-stat">
                          <span className="customer-detail__royalty-stat-value">{formatCurrency(royaltyReport.totalRoyalty)}</span>
                          <span className="customer-detail__royalty-stat-label">Royalty Owed</span>
                        </div>
                      </div>

                      {royaltyReport.discountedLineItems > 0 && (
                        <div className="customer-detail__royalty-discount-note">
                          {royaltyReport.discountedLineItems} discounted line item{royaltyReport.discountedLineItems > 1 ? 's' : ''} (no royalty)
                        </div>
                      )}

                      {/* Line items table */}
                      {royaltyReport.lineItems.length > 0 ? (
                        <div className="customer-detail__royalty-table-wrap">
                          <table className="customer-detail__royalty-table">
                            <thead>
                              <tr>
                                <th>Order</th>
                                <th>Date</th>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Royalty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {royaltyReport.lineItems.map((item, i) => (
                                <tr key={`${item.orderId}-${i}`} className={item.discounted ? 'royalty-row--discounted' : ''}>
                                  <td>{item.orderNumber}</td>
                                  <td>{formatDate(item.orderDate)}</td>
                                  <td>
                                    {item.productName}
                                    {item.color && <span className="royalty-row__variant"> {item.color}</span>}
                                    {item.size && <span className="royalty-row__variant"> / {item.size}</span>}
                                  </td>
                                  <td>{item.quantity}</td>
                                  <td>{formatCurrency(item.unitPrice)}</td>
                                  <td>
                                    {formatCurrency(item.royaltyTotal)}
                                    {item.discounted && <span className="royalty-row__discounted-badge">Disc</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="customer-detail__royalty-empty">
                          No orders found in this period
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomersTab;
