class LRUCache {
    private cache: Map<number, number>;
    private capacity: number;
    constructor(capacity: number) {
        if (capacity <= 0) throw new Error('Capacity must be > 0');
        this.cache = new Map();
        this.capacity = capacity;
    }

    get(key: number): number {
        if (!this.cache.has(key)) {
            return -1;
        }
        const value = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key: number, value: number): void {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.capacity) {
            this.cache.delete(this.cache.keys().next().value!);
        }
        this.cache.set(key, value);
    }
}
