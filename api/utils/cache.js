'use strict';

class TtlCache {
  constructor(options = {}) {
    const defaultTtlMs = Number(options.defaultTtlMs);
    const maxEntries = Number(options.maxEntries);

    this.defaultTtlMs = Number.isFinite(defaultTtlMs) && defaultTtlMs > 0 ? defaultTtlMs : 60_000;
    this.maxEntries = Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 100;
    this.store = new Map();
    this.pending = new Map();
  }

  _isExpired(entry) {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  _getEntry(key) {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (this._isExpired(entry)) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  has(key) {
    return Boolean(this._getEntry(key));
  }

  get(key) {
    const entry = this._getEntry(key);
    return entry ? entry.value : undefined;
  }

  set(key, value, options = {}) {
    const ttl = Number(options.ttlMs ?? this.defaultTtlMs);
    const hasTtl = Number.isFinite(ttl) && ttl > 0;
    const expiresAt = hasTtl ? Date.now() + ttl : null;

    const record = {
      value,
      expiresAt,
      createdAt: Date.now(),
    };

    this.store.set(key, record);
    this._enforceSizeLimit();
    return value;
  }

  delete(key) {
    this.pending.delete(key);
    return this.store.delete(key);
  }

  clear() {
    this.pending.clear();
    this.store.clear();
  }

  _enforceSizeLimit() {
    if (this.store.size <= this.maxEntries) {
      return;
    }

    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }

    if (this.store.size <= this.maxEntries) {
      return;
    }

    const entries = Array.from(this.store.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    while (this.store.size > this.maxEntries && entries.length) {
      const [key] = entries.shift();
      this.store.delete(key);
    }
  }

  remember(key, factory, options = {}) {
    if (this.has(key)) {
      return Promise.resolve(this.get(key));
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = Promise.resolve()
      .then(() => factory())
      .then((value) => {
        this.pending.delete(key);
        this.set(key, value, options);
        return value;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }
}

module.exports = { TtlCache };
