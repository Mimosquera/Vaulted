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

// maps raw errors to something the user can actually read
export function getUserFriendlyError(error) {
  if (!error) return ERROR_MESSAGES.SOMETHING_WRONG;

  const message = String(error.message || error.toString() || '').trim();
  const normalized = message.toLowerCase();

  if (!message) return ERROR_MESSAGES.SOMETHING_WRONG;

  if (normalized.includes('password') && (normalized.includes('at least 8') || normalized.includes('length must'))) {
    return ERROR_MESSAGES.PASSWORD_TOO_SHORT;
  }

  if (normalized.includes('unable to create account with this email') || normalized.includes('already exists') || normalized.includes('duplicate')) {
    return ERROR_MESSAGES.EMAIL_EXISTS;
  }

  if (normalized.includes('invalid email or password')) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }

  // Check for specific error patterns
  if (normalized.includes('401') || normalized.includes('unauthorized')) {
    return ERROR_MESSAGES.AUTH_REQUIRED;
  }
  if (normalized.includes('403') || normalized.includes('forbidden')) {
    return ERROR_MESSAGES.FORBIDDEN;
  }
  if (normalized.includes('404') || normalized.includes('not found')) {
    return ERROR_MESSAGES.COLLECTION_NOT_FOUND;
  }
  if (normalized.includes('invalid')) {
    if (normalized.includes('email')) return ERROR_MESSAGES.INVALID_EMAIL;
    if (normalized.includes('password')) return ERROR_MESSAGES.INVALID_CREDENTIALS;
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  if (normalized.includes('network') || normalized.includes('econnrefused')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (normalized.includes('timeout')) {
    return ERROR_MESSAGES.PLEASE_WAIT;
  }

  if (message.length <= 140 && !normalized.includes('internal server error')) {
    return message.replace(/"([a-z_]+)"/gi, (_, field) => `${field.charAt(0).toUpperCase()}${field.slice(1)}`);
  }

  // Fallback - never pass raw backend messages through
  return ERROR_MESSAGES.SOMETHING_WRONG;
}
