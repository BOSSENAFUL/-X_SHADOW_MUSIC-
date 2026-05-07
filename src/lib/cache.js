/**
 * In-memory cache for frequently accessed data
 * Reduces MongoDB queries significantly
 */

class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
    }

    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
    }

    get(key) {
        const expiry = this.ttl.get(key);

        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.ttl.delete(key);
            return null;
        }

        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
    }

    clear() {
        this.cache.clear();
        this.ttl.clear();
    }

    // Auto-cleanup every 5 minutes
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, expiry] of this.ttl.entries()) {
                if (now > expiry) {
                    this.cache.delete(key);
                    this.ttl.delete(key);
                }
            }
        }, 300000);
    }

    /**
     * Wrapper for cached database queries
     */
    async cachedQuery(key, queryFn, ttlSeconds = 300) {
        const cached = this.get(key);
        if (cached) return cached;

        const result = await queryFn();
        this.set(key, result, ttlSeconds);
        return result;
    }
}

// Global cache instance
const cache = new MemoryCache();
cache.startCleanup();

export default cache;
