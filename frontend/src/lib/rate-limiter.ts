/**
 * Rate limiter utility for managing concurrent API requests
 * Ensures we don't exceed API rate limits while maximizing throughput
 */

export class RateLimiter {
    private queue: Array<() => Promise<void>> = [];
    private running = 0;
    private maxConcurrent: number;
    private minDelay: number; // Minimum delay between requests in ms
    private lastRequestTime = 0;
    private cancelled = false;

    constructor(maxConcurrent: number = 5, minDelay: number = 200) {
        this.maxConcurrent = maxConcurrent;
        this.minDelay = minDelay;
    }

    cancel() {
        this.cancelled = true;
        this.queue = []; // Clear pending queue
    }

    isCancelled(): boolean {
        return this.cancelled;
    }

    /**
     * Execute a function with rate limiting
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const run = async () => {
                // Check cancellation before starting
                if (this.cancelled) {
                    reject(new Error('Cancelled'));
                    return;
                }

                this.running++;
                
                try {
                    // Check cancellation before delay
                    if (this.cancelled) {
                        throw new Error('Cancelled');
                    }

                    // Ensure minimum delay between requests
                    const now = Date.now();
                    const timeSinceLastRequest = now - this.lastRequestTime;
                    if (timeSinceLastRequest < this.minDelay) {
                        await new Promise(resolve => 
                            setTimeout(resolve, this.minDelay - timeSinceLastRequest)
                        );
                    }

                    // Check cancellation after delay
                    if (this.cancelled) {
                        throw new Error('Cancelled');
                    }

                    this.lastRequestTime = Date.now();

                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.running--;
                    this.processQueue();
                }
            };

            this.queue.push(run);
            this.processQueue();
        });
    }

    private processQueue() {
        // Don't process new items if cancelled
        if (this.cancelled) {
            return;
        }
        
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const next = this.queue.shift();
        if (next) {
            next();
        }
    }

    /**
     * Wait for all queued tasks to complete
     */
    async waitForAll(): Promise<void> {
        while (this.queue.length > 0 || this.running > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}

/**
 * Process an array of items in parallel batches with rate limiting
 */
export async function processInBatches<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: {
        concurrency?: number;
        minDelay?: number;
        onProgress?: (current: number, total: number, remainingTimeMs?: number) => void;
        shouldCancel?: () => boolean;
    } = {}
): Promise<R[]> {
    const {
        concurrency = 5,
        minDelay = 200,
        onProgress,
        shouldCancel
    } = options;

    const rateLimiter = new RateLimiter(concurrency, minDelay);
    const results: R[] = new Array(items.length);
    const errors: Array<{ index: number; error: any }> = [];
    let completedCount = 0;
    let cancelled = false;
    const startTime = Date.now();

    // Check cancellation status periodically
    const checkCancellation = () => {
        if (shouldCancel && shouldCancel()) {
            cancelled = true;
            rateLimiter.cancel();
            return true;
        }
        return false;
    };

    // Process all items in parallel with rate limiting
    const promises = items.map((item, index) =>
        rateLimiter.execute(async () => {
            // Check for cancellation before processing
            if (checkCancellation()) {
                throw new Error('Cancelled');
            }

            try {
                const result = await processor(item, index);
                
                // Check cancellation after processing
                if (checkCancellation()) {
                    throw new Error('Cancelled');
                }

                results[index] = result;
                completedCount++;
                
                if (onProgress) {
                    // Calculate remaining time (only after we have at least one completed item)
                    let remainingTimeMs: number | undefined = undefined;
                    if (completedCount > 0) {
                        const elapsedTime = Date.now() - startTime;
                        const averageTimePerItem = elapsedTime / completedCount;
                        const remainingItems = items.length - completedCount;
                        remainingTimeMs = remainingItems * averageTimePerItem;
                    }
                    onProgress(completedCount, items.length, remainingTimeMs);
                }
            } catch (error: any) {
                // Check if this is a cancellation
                const isCancellation = error?.message === 'Cancelled' || checkCancellation();
                
                if (isCancellation) {
                    // Mark as cancelled and stop processing
                    cancelled = true;
                    rateLimiter.cancel();
                    // Don't count cancelled items as errors
                    results[index] = undefined as any;
                    throw error;
                } else {
                    // Track actual errors
                    errors.push({ index, error });
                    results[index] = undefined as any;
                    completedCount++;
                    
                    if (onProgress) {
                        // Calculate remaining time (only after we have at least one completed item)
                        let remainingTimeMs: number | undefined = undefined;
                        if (completedCount > 0) {
                            const elapsedTime = Date.now() - startTime;
                            const averageTimePerItem = elapsedTime / completedCount;
                            const remainingItems = items.length - completedCount;
                            remainingTimeMs = remainingItems * averageTimePerItem;
                        }
                        onProgress(completedCount, items.length, remainingTimeMs);
                    }
                }
            }
        }).catch((error: any) => {
            // Handle cancellation errors gracefully
            if (error?.message === 'Cancelled') {
                results[index] = undefined as any;
            }
            return undefined;
        })
    );

    // Wait for promises to complete, but return early if cancelled
    // We use a race condition: either all promises complete, or cancellation is detected
    let checkInterval: NodeJS.Timeout | null = null;
    const cancellationPromise = new Promise<void>((resolve) => {
        checkInterval = setInterval(() => {
            if (cancelled) {
                if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                }
                resolve();
            }
        }, 50); // Check every 50ms for cancellation
    });

    try {
        // Race between completion and cancellation
        // If cancelled, we return early with partial results
        await Promise.race([
            Promise.allSettled(promises),
            cancellationPromise
        ]);
    } catch (error) {
        // Promise.allSettled never rejects, but handle just in case
        if (error instanceof Error && error.message === 'Cancelled') {
            cancelled = true;
        }
    } finally {
        // Always clean up the interval
        if (checkInterval) {
            clearInterval(checkInterval);
        }
    }

    // If there were errors and we weren't cancelled, log them
    if (errors.length > 0 && !cancelled) {
        console.warn(`${errors.length} items failed to process:`, errors);
    }

    return results;
}

