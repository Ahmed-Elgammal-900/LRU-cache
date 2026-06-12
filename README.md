# LRU Cache

A TypeScript implementation of an LRU Cache using Map's native insertion-order 
guarantee — achieving O(1) get and put without a doubly linked list.

## The Real World Problem
In any backend API, hitting the database on every 
request is slow and expensive. We need a smarter 
way to store frequently accessed data in memory 
and automatically remove data that hasn't been 
used recently.

This is exactly how Redis works under the hood —
and how I used it in my SaaS project to reduce 
database calls significantly.

## What is an LRU Cache?
LRU stands for Least Recently Used. It's a caching 
strategy that:
- Stores up to N items in memory
- When full, removes the item used least recently
- Always keeps the most recently accessed items

## My Approach
I used a single Map, which preserves insertion order natively in JavaScript.

**Map** → O(1) lookup + O(1) ordered eviction

The key insight: delete + re-insert moves a key to the "most recent" 
position, giving us LRU behavior without a linked list.

## How It Works

### GET item:

→ found? delete + re-insert (promotes to most recent), return value

→ not found? return -1

### PUT item:
→ already exists? delete + re-insert (promotes to most recent)
→ cache full? evict first key (LRU), insert new key at end
→ not full? just insert

## Complexity
- Time: O(1) for get and put
- Space: O(n) where n = cache capacity

## Real World Connection
This exact pattern is used in:
- Redis eviction policies (allkeys-lru)
- Browser cache management
- CDN edge caching
- My SaaS project API caching layer

## What I Learned
Before this I thought caching was just storing 
data in memory. Now I understand that the eviction 
strategy is what makes caching actually work at 
scale — you need a smart way to decide what to 
keep and what to throw away.