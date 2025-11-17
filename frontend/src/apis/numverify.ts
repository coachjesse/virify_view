// NumVerify API integration
// Note: You'll need to add your NumVerify API key to environment variables

import { db } from "@/firebase/firebase";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

export interface NumVerifyResponse {
    valid: boolean;
    number: string;
    local_format: string;
    international_format: string;
    country_prefix: string;
    country_code: string;
    country_name: string;
    location: string;
    carrier: string;
    line_type: string | null; // "mobile" | "landline" | "voip" | "unknown" | null
}

export interface NumVerifyError {
    success: false;
    error: {
        code: number;
        type: string;
        info: string;
    };
}

// Storage key for API key in localStorage
const API_KEY_STORAGE_KEY = 'numverify_api_key';

/**
 * Get API key from localStorage or environment variables
 * Priority: localStorage > environment variable
 */
export const getApiKey = async (): Promise<string> => {
    // 1️⃣ Try Firestore first
    const ref = doc(db, "apikey", "userApiKey");
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const value = snap.data().value;
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return ""
};

/**
 * Save API key to localStorage
 */
export const setApiKey = async (apiKey: string): Promise<void> => {
    const ref = doc(db, "apikey", "userApiKey");

    if (apiKey.trim()) {
        await setDoc(ref, { value: apiKey.trim() });
    } else {
        await deleteDoc(ref);
    }
};

/**
 * Get the current API key (for display purposes, masked)
 */
export const getApiKeyDisplay = (apiKey: string) => {
    const key =  apiKey;
    if (!key) return '';
    // Show first 8 characters and last 4 characters, mask the rest
    if (key.length <= 12) {
        return '*'.repeat(key.length);
    }
    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
};

/**
 * Verify a phone number using NumVerify API
 * @param phoneNumber Phone number in E.164 format (e.g., +14158586273) or any format
 * @returns NumVerify response or error
 */
export const verifyPhoneNumber = async (
    apiKey: string,
    phoneNumber: string
): Promise<NumVerifyResponse | NumVerifyError> => {

    if (!apiKey) {
        return {
            success: false,
            error: {
                code: 401,
                type: 'missing_api_key',
                info: 'NumVerify API key is not configured. Please set VITE_NUMVERIFY_API_KEY in your environment variables.',
            },
        };
    }

    // Clean phone number - remove all non-digit characters except +
    let cleanNumber = phoneNumber.trim();

    // If number doesn't start with +, try to format it
    if (!cleanNumber.startsWith('+')) {
        // Remove all non-digits
        const digits = cleanNumber.replace(/\D/g, '');

        // If it's a US number (10 digits or 11 starting with 1)
        if (digits.length === 10) {
            cleanNumber = `+1${digits}`;
        } else if (digits.length === 11 && digits[0] === '1') {
            cleanNumber = `+${digits}`;
        } else {
            // For other countries, assume it needs country code
            // This is a limitation - ideally users should provide full international format
            cleanNumber = `+${digits}`;
        }
    }

    try {
        const response = await fetch(
            `https://apilayer.net/api/validate?access_key=${apiKey}&number=${encodeURIComponent(cleanNumber)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        // Check for CORS errors
        if (response.type === 'opaque' || response.status === 0) {
            return {
                success: false,
                error: {
                    code: 0,
                    type: 'cors_error',
                    info: 'CORS error: NumVerify API cannot be called directly from the browser. Please set up a backend proxy or use NumVerify\'s paid tier with CORS enabled.',
                },
            };
        }

        const data = await response.json();

        // Check if response contains error
        if (data.error) {
            return {
                success: false,
                error: {
                    code: data.error.code || response.status,
                    type: data.error.type || 'api_error',
                    info: data.error.info || 'Failed to verify phone number',
                },
            };
        }

        // Check if number is invalid
        if (!data.valid) {
            return {
                success: false,
                error: {
                    code: 400,
                    type: 'invalid_number',
                    info: 'The phone number is invalid',
                },
            };
        }

        return data as NumVerifyResponse;
    } catch (error: any) {
        // Check for CORS or network errors
        if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
            return {
                success: false,
                error: {
                    code: 0,
                    type: 'cors_error',
                    info: 'CORS error: NumVerify API cannot be called directly from the browser. Please set up a backend proxy or use NumVerify\'s paid tier with CORS enabled.',
                },
            };
        }

        return {
            success: false,
            error: {
                code: 500,
                type: 'network_error',
                info: error.message || 'Network error occurred while verifying phone number',
            },
        };
    }
};


