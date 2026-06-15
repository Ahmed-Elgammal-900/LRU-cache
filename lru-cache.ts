import type { CacheNode, CacheOptions, CacheStats } from './types';

export class LRUCache<Key, Value> {
    private cache: Map<Key, CacheNode<Key, Value>>;
    private maxSize: number;
    private ttlMs: number | null;

    private readonly head: CacheNode<Key, Value>;
    private readonly tail: CacheNode<Key, Value>;

    private hits = 0;
    private misses = 0;
    private evictions = 0;

    private lock = false;
    private lockQueue: Array<() => void> = [];

    constructor({ maxSize, ttlMs }: CacheOptions) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs ?? null;

        this.head = this.createNode(null as Key, null as Value);
        this.tail = this.createNode(null as Key, null as Value);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    private acquireLock(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.lock) {
                this.lock = true;
                resolve();
            } else {
                this.lockQueue.push(resolve);
            }
        });
    }

    private releaseLock(): void {
        const next = this.lockQueue.shift();
        if (next) {
            next();
        } else {
            this.lock = false;
        }
    }

    async get(key: Key) {
        await this.acquireLock();
        try {
            const node = this.cache.get(key);

            if (!node) {
                this.misses++;
                return null;
            }

            if (this.isExpired(node)) {
                this.removeNode(node);
                this.cache.delete(key);
                this.misses++;
                return null;
            }

            this.moveToFront(node);
            this.hits++;
            return node.value;
        } finally {
            this.releaseLock();
        }
    }

    async put(key: Key, value: Value) {
        await this.acquireLock();
        try {
            const existing = this.cache.get(key);
            if (existing) {
                existing.value = value;
                existing.expiresAt = this.ttlMs
                    ? Date.now() + this.ttlMs
                    : null;
                this.moveToFront(existing);
                return;
            }

            if (this.cache.size >= this.maxSize) {
                this.evictLRU();
            }

            const node = this.createNode(key, value);
            this.cache.set(key, node);
            this.insertAtFront(node);
        } finally {
            this.releaseLock();
        }
    }

    async delete(key: Key): Promise<boolean> {
        await this.acquireLock();
        try {
            const node = this.cache.get(key);
            if (!node) return false;
            this.removeNode(node);
            this.cache.delete(key);
            return true;
        } finally {
            this.releaseLock();
        }
    }

    private isExpired(node: CacheNode<Key, Value>): boolean {
        return node.expiresAt !== null && Date.now() > node.expiresAt;
    }

    async purgeExpired(): Promise<number> {
        await this.acquireLock();
        try {
            let purged = 0;
            for (const [key, node] of this.cache.entries()) {
                if (this.isExpired(node)) {
                    this.removeNode(node);
                    this.cache.delete(key);
                    purged++;
                }
            }
            return purged;
        } finally {
            this.releaseLock();
        }
    }

    createNode(key: Key, value: Value): CacheNode<Key, Value> {
        return {
            key,
            value,
            next: null,
            prev: null,
            expiresAt: this.ttlMs ? Date.now() + this.ttlMs : null,
        };
    }

    private insertAtFront(node: CacheNode<Key, Value>): void {
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next!.prev = node;
        this.head.next = node;
    }

    private removeNode(node: CacheNode<Key, Value>): void {
        node.prev!.next = node.next;
        node.next!.prev = node.prev;
    }

    private moveToFront(node: CacheNode<Key, Value>): void {
        this.removeNode(node);
        this.insertAtFront(node);
    }

    private evictLRU(): void {
        const lru = this.tail.prev!;
        if (lru === this.head) return;
        this.removeNode(lru);
        this.cache.delete(lru.key);
        this.evictions++;
    }

    getStats(): CacheStats {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            hitRate:
                total === 0 ? 0 : Math.round((this.hits / total) * 10000) / 100,
            size: this.cache.size,
        };
    }

    resetStats(): void {
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }

    get size(): number {
        return this.cache.size;
    }
}
