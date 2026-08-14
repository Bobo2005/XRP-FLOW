import { toast as sonnerToast } from "sonner";

/**
 * Custom toast wrapper for consistent notifications
 */
export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 5000,
      position: "top-right",
    });
  },
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 8000,
      position: "top-right",
    });
  },
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 6000,
      position: "top-right",
    });
  },
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 6000,
      position: "top-right",
    });
  },
};

/**
 * Enhanced error recovery with retry mechanism
 */
export async function withErrorRecovery<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));

      // Show retry notification
      toast.info(`Retrying... (Attempt ${attempt + 2}/${maxRetries})`);
    }
  }

  throw lastError;
}