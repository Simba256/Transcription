/**
 * Email validation utilities for Talk to Text Canada
 * Validates email addresses and checks against allowed domains
 */

export interface EmailValidationConfig {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireBusinessEmail?: boolean;
  allowPersonalEmail?: boolean;
}

// Default configuration - you can modify these domains as needed
const DEFAULT_CONFIG: EmailValidationConfig = {
  // Common business/professional email domains
  allowedDomains: [
    // Major email providers
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'icloud.com',
    'protonmail.com',
    
    // Business email providers
    'office365.com',
    'googlebusiness.com',
    
    // Canadian government and institutions
    'gc.ca',
    'canada.ca',
    'gov.ca',
    
    // Common business domains (you can add more)
    'company.com',
    'corp.com',
    'business.com',
    'inc.com',
    'ltd.com',
    
    // Add your specific company domains here:
    // 'yourcompany.com',
    // 'anotherclient.com',
    // 'partnercompany.ca',
  ],
  
  // Domains to block (temporary email services, etc.)
  blockedDomains: [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'sharklasers.com',
    'yopmail.com',
  ],
  
  requireBusinessEmail: false,
  allowPersonalEmail: true,
};

/**
 * Validates email format using a robust regex pattern
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Extracts domain from email address
 */
export function getDomainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

/**
 * Checks if domain is in the allowed domains list
 */
export function isDomainAllowed(domain: string, config: EmailValidationConfig = DEFAULT_CONFIG): boolean {
  const lowercaseDomain = domain.toLowerCase();
  
  // If no allowed domains specified, allow all (except blocked)
  if (!config.allowedDomains || config.allowedDomains.length === 0) {
    return true;
  }
  
  // Check if domain or any parent domain is in allowed list
  return config.allowedDomains.some(allowedDomain => {
    const allowedLower = allowedDomain.toLowerCase();
    return lowercaseDomain === allowedLower || lowercaseDomain.endsWith('.' + allowedLower);
  });
}

/**
 * Checks if domain is in the blocked domains list
 */
export function isDomainBlocked(domain: string, config: EmailValidationConfig = DEFAULT_CONFIG): boolean {
  const lowercaseDomain = domain.toLowerCase();
  
  if (!config.blockedDomains || config.blockedDomains.length === 0) {
    return false;
  }
  
  return config.blockedDomains.some(blockedDomain => {
    const blockedLower = blockedDomain.toLowerCase();
    return lowercaseDomain === blockedLower || lowercaseDomain.endsWith('.' + blockedLower);
  });
}

/**
 * Determines if an email domain appears to be a business domain
 */
export function isBusinessDomain(domain: string): boolean {
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'icloud.com', 'aol.com', 'live.com', 'msn.com'
  ];
  
  const lowercaseDomain = domain.toLowerCase();
  return !personalDomains.includes(lowercaseDomain);
}

/**
 * Main email validation function
 */
export interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  domain: string;
  isBusinessEmail: boolean;
}

export function validateEmail(
  email: string, 
  config: EmailValidationConfig = DEFAULT_CONFIG
): EmailValidationResult {
  const result: EmailValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    domain: '',
    isBusinessEmail: false,
  };

  // Basic format validation
  if (!email || email.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Email address is required');
    return result;
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmailFormat(trimmedEmail)) {
    result.isValid = false;
    result.errors.push('Please enter a valid email address');
    return result;
  }

  // Extract domain
  const domain = getDomainFromEmail(trimmedEmail);
  result.domain = domain;
  result.isBusinessEmail = isBusinessDomain(domain);

  if (!domain) {
    result.isValid = false;
    result.errors.push('Invalid email domain');
    return result;
  }

  // Check blocked domains
  if (isDomainBlocked(domain, config)) {
    result.isValid = false;
    result.errors.push('This email domain is not allowed. Please use a different email address.');
    return result;
  }

  // Check allowed domains
  if (!isDomainAllowed(domain, config)) {
    result.isValid = false;
    result.errors.push(`Email domain "${domain}" is not allowed. Please use an email from an approved domain.`);
    return result;
  }

  // Business email requirements
  if (config.requireBusinessEmail && !result.isBusinessEmail) {
    result.errors.push('Please use a business email address');
    result.isValid = false;
  }

  // Personal email restrictions
  if (!config.allowPersonalEmail && !result.isBusinessEmail) {
    result.errors.push('Personal email addresses are not allowed. Please use a business email.');
    result.isValid = false;
  }

  // Add warnings for personal emails if business is preferred
  if (result.isBusinessEmail === false && config.requireBusinessEmail === false) {
    result.warnings.push('Consider using a business email for better account management');
  }

  return result;
}

/**
 * Quick validation function that returns just true/false
 */
export function isValidEmail(email: string, config?: EmailValidationConfig): boolean {
  return validateEmail(email, config).isValid;
}

/**
 * Get a list of suggested email domains
 */
export function getSuggestedDomains(): string[] {
  return [
    'gmail.com',
    'outlook.com',
    'company.com',
    'yourcompany.com',
    'business.ca',
    'corp.ca'
  ];
}

/**
 * Configuration presets for different use cases
 */
export const EMAIL_VALIDATION_PRESETS = {
  // Allow most common email providers
  PERMISSIVE: {
    allowedDomains: [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
      'protonmail.com', 'office365.com'
    ],
    blockedDomains: DEFAULT_CONFIG.blockedDomains,
    requireBusinessEmail: false,
    allowPersonalEmail: true,
  } as EmailValidationConfig,

  // Only business emails
  BUSINESS_ONLY: {
    allowedDomains: [], // Will allow any domain not in blocked list
    blockedDomains: [
      ...DEFAULT_CONFIG.blockedDomains!,
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'
    ],
    requireBusinessEmail: true,
    allowPersonalEmail: false,
  } as EmailValidationConfig,

  // Canadian organizations focus
  CANADIAN_FOCUS: {
    allowedDomains: [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
      'gc.ca', 'canada.ca', 'gov.ca', '.ca'
    ],
    blockedDomains: DEFAULT_CONFIG.blockedDomains,
    requireBusinessEmail: false,
    allowPersonalEmail: true,
  } as EmailValidationConfig,
};
