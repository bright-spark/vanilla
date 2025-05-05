/**
 * API utilities with retry mechanism
 * Provides functions for making API requests with exponential backoff retry
 */

/**
 * Configuration options for the fetch with retry function
 */
export interface FetchWithRetryOptions extends RequestInit {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before the first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelay?: number;
  /** Backoff factor - how much to multiply the delay by after each retry (default: 2) */
  backoffFactor?: number;
  /** Function to determine if a response should trigger a retry (default: !response.ok) */
  shouldRetry?: (response: Response) => boolean | Promise<boolean>;
  /** Function to determine if an error should trigger a retry (default: true for network errors) */
  shouldRetryOnError?: (error: Error) => boolean | Promise<boolean>;
  /** Callback function that gets called before each retry with the retry count and delay */
  onRetry?: (retryCount: number, delay: number, error?: Error) => void;
}

/**
 * Fetch with retry and exponential backoff
 * @param url The URL to fetch
 * @param options Fetch options with retry configuration
 * @returns Promise with the fetch response
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (response) => !response.ok,
    shouldRetryOnError = (error) => true,
    onRetry = () => {},
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      // If the response is successful or we shouldn't retry this response, return it
      if (!await shouldRetry(response)) {
        return response;
      }

      // If we've reached the maximum number of retries, return the last response
      if (retryCount === maxRetries) {
        return response;
      }

      // Calculate the delay for the next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      // Call the onRetry callback
      onRetry(retryCount + 1, delay);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error as Error;
      
      // If we've reached the maximum number of retries, throw the last error
      if (retryCount === maxRetries) {
        throw lastError;
      }

      // If we shouldn't retry for this error, throw it immediately
      if (!await shouldRetryOnError(lastError)) {
        throw lastError;
      }

      // Calculate the delay for the next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
      
      // Call the onRetry callback with the error
      onRetry(retryCount + 1, delay, lastError);
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never happen, but TypeScript requires a return statement
  throw lastError || new Error('Maximum retries reached');
}

/**
 * Fetch JSON data with retry mechanism
 * @param url The URL to fetch
 * @param options Fetch options with retry configuration
 * @returns Promise with the parsed JSON data
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json() as T;
}
