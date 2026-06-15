export interface BenchmarkResult {
    cacheSize: number;
    hitRate: number;
    opsPerSecond: number;
    totalOps: number;
}

export interface CacheNode<Key, Value> {
    key: Key;
    value: Value;
    prev: CacheNode<Key, Value> | null;
    next: CacheNode<Key, Value> | null;
    expiresAt: number | null;
}

export interface CacheOptions {
    ttlMs?: number;
    maxSize: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
    size: number;
}
