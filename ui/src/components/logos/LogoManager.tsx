/**
 * LogoManager -- Full logo management panel with grid display and CRUD operations.
 *
 * Supports uploading, viewing, editing metadata, and deleting logos from the registry.
 * Touch-optimized with 44px minimum touch targets and dark theme styling.
 *
 * Phase 48: Logo System
 */

import { useState, useEffect, useCallback } from 'react';
import './LogoManager.css';

interface LogoManagerProps {
  onClose: () => void;
  onLogoSelect?: (logoKey: string) => void;
}

interface LogoEntry {
  displayName: string;
  filePath: string;
  defaultScale: number;
  defaultBlendMode: string;
  defaultOpacity: number;
}

type BlendMode = 'multiply' | 'screen' | 'overlay' | 'over';

function LogoManager({ onClose, onLogoSelect }: LogoManagerProps) {
  const [logos, setLogos] = useState<Record<string, LogoEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadKey, setUploadKey] = useState('');
  const [uploadKeyEdited, setUploadKeyEdited] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editScale, setEditScale] = useState(0.25);
  const [editOpacity, setEditOpacity] = useState(0.88);
  const [editBlendMode, setEditBlendMode] = useState<BlendMode>('multiply');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  // Fetch logos on mount
  const fetchLogos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/logos');
      if (!res.ok) throw new Error(`Failed to load logos: ${res.status}`);
      const data = await res.json();
      setLogos(data.logos || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  // Auto-generate key from display name
  const generateKey = (name: string): string =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');

  const handleDisplayNameChange = (value: string) => {
    setUploadDisplayName(value);
    if (!uploadKeyEdited) {
      setUploadKey(generateKey(value));
    }
  };

  // Upload handler
  const handleUpload = async () => {
    if (!uploadFile || !uploadKey || !uploadDisplayName) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const buffer = await uploadFile.arrayBuffer();
      const res = await fetch('/api/logos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': uploadFile.type || 'application/octet-stream',
          'X-Logo-Key': uploadKey,
          'X-Logo-Display-Name': uploadDisplayName,
        },
        body: buffer,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }));
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }

      setUploadSuccess(`"${uploadDisplayName}" uploaded successfully.`);
      setUploadDisplayName('');
      setUploadKey('');
      setUploadKeyEdited(false);
      setUploadFile(null);
      // Reset file input
      const fileInput = document.getElementById('logo-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchLogos();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  // Edit handlers
  const startEdit = (key: string) => {
    if (editingKey === key) {
      setEditingKey(null);
      return;
    }
    const entry = logos[key];
    setEditingKey(key);
    setEditDisplayName(entry.displayName);
    setEditScale(entry.defaultScale);
    setEditOpacity(entry.defaultOpacity);
    setEditBlendMode(entry.defaultBlendMode as BlendMode);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingKey) return;

    setSaving(true);
    setEditError('');

    try {
      const res = await fetch(`/api/logos/${editingKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editDisplayName,
          defaultScale: editScale,
          defaultOpacity: editOpacity,
          defaultBlendMode: editBlendMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Save failed: ${res.status}` }));
        throw new Error(data.error || `Save failed: ${res.status}`);
      }

      setEditingKey(null);
      await fetchLogos();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteKey) return;

    try {
      const res = await fetch(`/api/logos/${deleteKey}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Delete failed: ${res.status}` }));
        throw new Error(data.error || `Delete failed: ${res.status}`);
      }
      setDeleteKey(null);
      await fetchLogos();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleteKey(null);
    }
  };

  const logoKeys = Object.keys(logos);

  return (
    <div className="logo-manager">
      {/* Header */}
      <div className="logo-manager__header">
        <button
          type="button"
          className="logo-manager__back-btn"
          onClick={onClose}
          aria-label="Back"
        >
          &#8592;
        </button>
        <h2 className="logo-manager__title">Manage Logos</h2>
      </div>

      {/* Upload toggle */}
      <button
        type="button"
        className="logo-manager__upload-toggle"
        onClick={() => {
          setShowUpload(!showUpload);
          setUploadError('');
          setUploadSuccess('');
        }}
      >
        {showUpload ? 'Cancel Upload' : '+ Upload Logo'}
      </button>

      {/* Upload form */}
      {showUpload && (
        <div className="logo-manager__upload-form">
          <div className="logo-manager__field">
            <label className="logo-manager__label" htmlFor="logo-display-name">
              Display Name
            </label>
            <input
              id="logo-display-name"
              type="text"
              className="logo-manager__input"
              placeholder="e.g. Big Logo Black"
              value={uploadDisplayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
            />
          </div>

          <div className="logo-manager__field">
            <label className="logo-manager__label" htmlFor="logo-key">
              Key
            </label>
            <input
              id="logo-key"
              type="text"
              className="logo-manager__input"
              placeholder="auto-generated-from-name"
              value={uploadKey}
              onChange={(e) => {
                setUploadKey(e.target.value);
                setUploadKeyEdited(true);
              }}
            />
          </div>

          <div className="logo-manager__field">
            <label className="logo-manager__label" htmlFor="logo-file-input">
              Image File
            </label>
            <input
              id="logo-file-input"
              type="file"
              accept="image/*"
              className="logo-manager__file-input"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          {uploadError && <div className="logo-manager__message logo-manager__message--error">{uploadError}</div>}
          {uploadSuccess && <div className="logo-manager__message logo-manager__message--success">{uploadSuccess}</div>}

          <button
            type="button"
            className="logo-manager__upload-btn"
            onClick={handleUpload}
            disabled={uploading || !uploadFile || !uploadKey || !uploadDisplayName}
          >
            {uploading ? (
              <>
                <span className="logo-manager__spinner" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="logo-manager__message logo-manager__message--error">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="logo-manager__loading">
          <span className="logo-manager__spinner" /> Loading logos...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && logoKeys.length === 0 && (
        <div className="logo-manager__empty">
          No logos yet. Upload your first logo to get started.
        </div>
      )}

      {/* Logo grid */}
      {!loading && logoKeys.length > 0 && (
        <div className="logo-manager__grid">
          {logoKeys.map((key) => {
            const entry = logos[key];
            const isEditing = editingKey === key;

            return (
              <div
                key={key}
                className={`logo-manager__card${isEditing ? ' logo-manager__card--editing' : ''}${onLogoSelect ? ' logo-manager__card--selectable' : ''}`}
              >
                {/* Card content */}
                <div
                  className="logo-manager__card-main"
                  onClick={() => (onLogoSelect ? onLogoSelect(key) : startEdit(key))}
                >
                  <div className="logo-manager__thumb-wrap">
                    <img
                      src={`/api/logos/file/${key}`}
                      alt={entry.displayName}
                      className="logo-manager__thumb"
                      loading="lazy"
                    />
                  </div>
                  <div className="logo-manager__card-info">
                    <span className="logo-manager__card-name">{entry.displayName}</span>
                    <span className="logo-manager__card-key">{key}</span>
                    <div className="logo-manager__card-badges">
                      <span className="logo-manager__badge">{Math.round(entry.defaultScale * 100)}%</span>
                      <span className="logo-manager__badge">{Math.round(entry.defaultOpacity * 100)}% opacity</span>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  className="logo-manager__delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteKey(key);
                  }}
                  aria-label={`Delete ${entry.displayName}`}
                  title="Delete"
                >
                  &#128465;
                </button>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="logo-manager__edit-form" onClick={(e) => e.stopPropagation()}>
                    <div className="logo-manager__field">
                      <label className="logo-manager__label">Display Name</label>
                      <input
                        type="text"
                        className="logo-manager__input"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                      />
                    </div>

                    <div className="logo-manager__field">
                      <label className="logo-manager__label">
                        Scale: {Math.round(editScale * 100)}%
                      </label>
                      <input
                        type="range"
                        className="logo-manager__range"
                        min="0.05"
                        max="0.80"
                        step="0.05"
                        value={editScale}
                        onChange={(e) => setEditScale(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="logo-manager__field">
                      <label className="logo-manager__label">
                        Opacity: {Math.round(editOpacity * 100)}%
                      </label>
                      <input
                        type="range"
                        className="logo-manager__range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={editOpacity}
                        onChange={(e) => setEditOpacity(parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="logo-manager__field">
                      <label className="logo-manager__label">Blend Mode</label>
                      <select
                        className="logo-manager__select"
                        value={editBlendMode}
                        onChange={(e) => setEditBlendMode(e.target.value as BlendMode)}
                      >
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="over">Over</option>
                      </select>
                    </div>

                    {editError && (
                      <div className="logo-manager__message logo-manager__message--error">{editError}</div>
                    )}

                    <div className="logo-manager__edit-actions">
                      <button
                        type="button"
                        className="logo-manager__btn logo-manager__btn--cancel"
                        onClick={() => setEditingKey(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="logo-manager__btn logo-manager__btn--save"
                        onClick={handleSaveEdit}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteKey && (
        <div className="logo-manager__overlay" onClick={() => setDeleteKey(null)}>
          <div className="logo-manager__dialog" onClick={(e) => e.stopPropagation()}>
            <p className="logo-manager__dialog-text">
              Delete <strong>{logos[deleteKey]?.displayName || deleteKey}</strong>? This cannot be undone.
            </p>
            <div className="logo-manager__dialog-actions">
              <button
                type="button"
                className="logo-manager__btn logo-manager__btn--cancel"
                onClick={() => setDeleteKey(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="logo-manager__btn logo-manager__btn--danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogoManager;
