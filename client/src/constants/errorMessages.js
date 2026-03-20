// User-friendly error messages for common issues
export const ERROR_MESSAGES = {
  // Auth errors
  AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
  NETWORK_ERROR: 'Connection error. Check your internet and try again.',

  // Authorization errors
  UNAUTHORIZED: 'You need to sign in to access this.',
  FORBIDDEN: 'You do not have permission to access this collection.',

  // Collection/Item errors
  COLLECTION_NOT_FOUND: 'Collection not found or is private.',
  COLLECTION_DELETED: 'Collection has been deleted.',
  ITEM_NOT_FOUND: 'Item not found.',

  // Sync errors
  SYNC_FAILED: 'Failed to sync. Check your connection and try again.',
  UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  DOWNLOAD_FAILED: 'Failed to load image. Please try again.',

  // Generic errors
  SOMETHING_WRONG: 'Something went wrong. Please try again.',
  TRY_AGAIN: 'An error occurred. Please try again.',
  PLEASE_WAIT: 'Please wait a moment and try again.',
};

// Error message resolver - maps API/system errors to user-friendly messages
export function getUserFriendlyError(error) {
  if (!error) return ERROR_MESSAGES.SOMETHING_WRONG;

  const message = error.message || error.toString();

  // Check for specific error patterns
  if (message.includes('401') || message.includes('Unauthorized')) {
    return ERROR_MESSAGES.AUTH_REQUIRED;
  }
  if (message.includes('403') || message.includes('Forbidden')) {
    return ERROR_MESSAGES.FORBIDDEN;
  }
  if (message.includes('404') || message.includes('not found')) {
    return ERROR_MESSAGES.COLLECTION_NOT_FOUND;
  }
  if (message.includes('already exists') || message.includes('duplicate')) {
    return ERROR_MESSAGES.EMAIL_EXISTS;
  }
  if (message.includes('Invalid') || message.includes('invalid')) {
    if (message.includes('email')) return ERROR_MESSAGES.INVALID_EMAIL;
    if (message.includes('password')) return ERROR_MESSAGES.INVALID_CREDENTIALS;
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  if (message.includes('Network') || message.includes('ECONNREFUSED')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (message.includes('timeout')) {
    return ERROR_MESSAGES.PLEASE_WAIT;
  }

  // Fallback - never pass raw backend messages through
  return ERROR_MESSAGES.SOMETHING_WRONG;
}
