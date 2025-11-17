
import * as XLSX from 'xlsx';
import { verifyPhoneNumber, NumVerifyResponse, NumVerifyError, getApiKey } from '@/apis/numverify';

export interface ExcelPreview {
    success: boolean;
    fileName: string;
    totalRows: number;
    previewRows: any[][];
    columns: number;
    error?: string;
}

export const previewExcelFile = async (file: File): Promise<ExcelPreview> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Get first 10 rows
        const previewRows = data.slice(0, 10);
        
        // Find max columns
        const maxColumns = Math.max(...data.map(row => row.length), 0);

        return {
            success: true,
            fileName: file.name,
            totalRows: data.length,
            previewRows: previewRows,
            columns: maxColumns
        };
    } catch (error: any) {
        return {
            success: false,
            fileName: file.name,
            totalRows: 0,
            previewRows: [],
            columns: 0,
            error: error?.message || "Unknown error occurred"
        };
    }
};

export const analyzeExcelFile = async (file: File, selectedColumnIndex?: number) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const results: Array<{
            row: number;
            phoneNumbers: Array<{
                column: number;
                columnLetter: string;
                originalValue: string;
                phoneNumber: string;
                // formatted: string;
            }>;
        }> = [];

        data.forEach((row: any, rowIndex: number) => {
            const phoneNumbers: Array<{
                column: number;
                columnLetter: string;
                originalValue: string;
                phoneNumber: string;
                // formatted: string;
            }> = [];

            // If column is specified, only process that column
            if (selectedColumnIndex !== undefined && selectedColumnIndex !== null) {
                const cell = row[selectedColumnIndex];
                if (cell !== null && cell !== undefined) {
                    const cellValue = String(cell);
                    const detectedNumbers = detectPhoneNumbers(cellValue);

                    detectedNumbers.forEach((number: string) => {
                        phoneNumbers.push({
                            column: selectedColumnIndex,
                            columnLetter: XLSX.utils.encode_col(selectedColumnIndex),
                            originalValue: cellValue,
                            phoneNumber: number
                            // formatted: formatPhoneNumber(number)
                        });
                    });
                }
            } else {
                // Process all columns (original behavior)
                row.forEach((cell: any, cellIndex: number) => {
                    if (cell !== null && cell !== undefined) {
                        const cellValue = String(cell);
                        const detectedNumbers = detectPhoneNumbers(cellValue);

                        detectedNumbers.forEach((number: string) => {
                            phoneNumbers.push({
                                column: cellIndex,
                                columnLetter: XLSX.utils.encode_col(cellIndex),
                                originalValue: cellValue,
                                phoneNumber: number
                                // formatted: formatPhoneNumber(number)
                            });
                        });
                    }
                });
            }

            if (phoneNumbers.length > 0) {
                results.push({
                    row: rowIndex + 1,
                    phoneNumbers: phoneNumbers
                });
            }
        });

        return {
            success: true,
            fileName: file.name,
            totalRows: data.length,
            rowsWithPhones: results.length,
            data: results,
            summary: {
                totalPhoneNumbers: results.reduce((sum, r) => sum + r.phoneNumbers.length, 0)
            }
        };

    } catch (error: any) {
        return {
            success: false,
            error: error?.message || "Unknown error occurred"
        };
    }
};

const detectPhoneNumbers = (text: string | number): string[] => {
    const phoneNumbers: string[] = [];
    const cleanText = text.toString();

    const intlPattern = /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const usPattern = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})/g;
    const generalPattern = /\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{0,4}/g;

    let matches = cleanText.match(intlPattern);
    if (matches) {
        phoneNumbers.push(...matches.map(m => m.trim()));
    }

    matches = cleanText.match(usPattern);
    if (matches) {
        matches.forEach(m => {
            const cleaned = m.replace(/\D/g, '');
            if (cleaned.length === 10 && !phoneNumbers.some(p => p.includes(cleaned))) {
                phoneNumbers.push(m.trim());
            }
        });
    }

    if (phoneNumbers.length === 0) {
        matches = cleanText.match(generalPattern);
        if (matches) {
            matches.forEach(m => {
                const digitCount = m.replace(/\D/g, '').length;
                if (digitCount >= 7 && digitCount <= 15) {
                    phoneNumbers.push(m.trim());
                }
            });
        }
    }

    return [...new Set(phoneNumbers)];
};

const formatPhoneNumber = (phoneNumber: string): string => {
    const digits = phoneNumber.replace(/\D/g, '');

    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else {
        return phoneNumber;
    }
};

export interface VerifiedPhoneNumber {
    row: number;
    originalValue: string;
    phoneNumber: string;
    // formatted: string;
    valid: boolean;
    lineType: string | null; // "mobile" | "landline" | "voip" | "unknown" | null
    countryName: string;
    carrier: string;
    location: string;
    verificationData: NumVerifyResponse | null;
    error?: string;
}

export interface VerificationResult {
    success: boolean;
    fileName: string;
    totalRows: number;
    totalPhoneNumbers: number;
    validNumbers: VerifiedPhoneNumber[];
    invalidNumbers: VerifiedPhoneNumber[];
    mobileNumbers: VerifiedPhoneNumber[];
    landlineNumbers: VerifiedPhoneNumber[];
    error?: string;
    cancelled?: boolean;
    processedCount?: number;
    totalCount?: number;
    originalData?: any[][]; // Original Excel data (all rows with all columns)
    selectedColumnIndex?: number; // The column index that was selected for processing
}

export const verifyAndCategorizePhones = async (
    file: File,
    selectedColumnIndex: number,
    onProgress?: (current: number, total: number, status: string) => void,
    shouldCancel?: () => boolean
): Promise<VerificationResult> => {
    const apiKey = await getApiKey();
    try {
        // Read the original Excel file data first
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const originalData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // First, extract phone numbers
        const analysisResult = await analyzeExcelFile(file, selectedColumnIndex);
        
        if (!analysisResult.success) {
            return {
                success: false,
                fileName: file.name,
                totalRows: 0,
                totalPhoneNumbers: 0,
                validNumbers: [],
                invalidNumbers: [],
                mobileNumbers: [],
                landlineNumbers: [],
                error: analysisResult.error,
                originalData: originalData,
                selectedColumnIndex: selectedColumnIndex
            };
        }

        // Collect all unique phone numbers
        const phoneNumberMap = new Map<string, { row: number; originalValue: string;}>();
        
        analysisResult.data.forEach((rowData) => {
            rowData.phoneNumbers.forEach((phone) => {
                const key = phone.phoneNumber.replace(/\D/g, '');
                if (!phoneNumberMap.has(key)) {
                    phoneNumberMap.set(key, {
                        row: rowData.row,
                        originalValue: phone.originalValue,
                        // formatted: phone.formatted
                    });
                }
            });
        });

        const uniquePhones = Array.from(phoneNumberMap.entries());
        const verifiedPhones: VerifiedPhoneNumber[] = [];
        const totalCount = uniquePhones.length;

        // Verify each phone number
        for (let i = 0; i < uniquePhones.length; i++) {
            // Check for cancellation
            if (shouldCancel && shouldCancel()) {
                // Categorize numbers processed so far
                const validNumbers = verifiedPhones.filter(p => p.valid);
                const invalidNumbers = verifiedPhones.filter(p => !p.valid);
                const mobileNumbers = validNumbers.filter(p => p.lineType === 'mobile');
                const landlineNumbers = validNumbers.filter(p => p.lineType === 'landline');

                return {
                    success: true,
                    fileName: file.name,
                    totalRows: analysisResult.totalRows,
                    totalPhoneNumbers: verifiedPhones.length,
                    validNumbers,
                    invalidNumbers,
                    mobileNumbers,
                    landlineNumbers,
                    cancelled: true,
                    processedCount: verifiedPhones.length,
                    totalCount: totalCount,
                    originalData: originalData,
                    selectedColumnIndex: selectedColumnIndex
                };
            }

            const [phoneNumber, data] = uniquePhones[i];
            
            if (onProgress) {
                onProgress(i + 1, uniquePhones.length, `Verifying ${i + 1}/${uniquePhones.length}...`);
            }

            const verification = await verifyPhoneNumber(apiKey, data.originalValue);
            
            const verifiedPhone: VerifiedPhoneNumber = {
                row: data.row,
                originalValue: data.originalValue,
                phoneNumber: phoneNumber,
                // formatted: data.formatted,
                valid: 'valid' in verification ? verification.valid : false,
                lineType: 'line_type' in verification ? verification.line_type : null,
                countryName: 'country_name' in verification ? verification.country_name : '',
                carrier: 'carrier' in verification ? verification.carrier : '',
                location: 'location' in verification ? verification.location : '',
                verificationData: 'valid' in verification ? verification : null,
                error: 'error' in verification ? verification.error.info : undefined
            };

            verifiedPhones.push(verifiedPhone);

            // Check for cancellation before rate limiting delay
            if (shouldCancel && shouldCancel()) {
                // Categorize numbers processed so far
                const validNumbers = verifiedPhones.filter(p => p.valid);
                const invalidNumbers = verifiedPhones.filter(p => !p.valid);
                const mobileNumbers = validNumbers.filter(p => p.lineType === 'mobile');
                const landlineNumbers = validNumbers.filter(p => p.lineType === 'landline');

                return {
                    success: true,
                    fileName: file.name,
                    totalRows: analysisResult.totalRows,
                    totalPhoneNumbers: verifiedPhones.length,
                    validNumbers,
                    invalidNumbers,
                    mobileNumbers,
                    landlineNumbers,
                    cancelled: true,
                    processedCount: verifiedPhones.length,
                    totalCount: totalCount,
                    originalData: originalData,
                    selectedColumnIndex: selectedColumnIndex
                };
            }

            // Rate limiting - wait 1 second between requests (NumVerify free tier limit)
            if (i < uniquePhones.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Categorize numbers
        const validNumbers = verifiedPhones.filter(p => p.valid);
        const invalidNumbers = verifiedPhones.filter(p => !p.valid);
        const mobileNumbers = validNumbers.filter(p => p.lineType === 'mobile');
        const landlineNumbers = validNumbers.filter(p => p.lineType === 'landline');

        return {
            success: true,
            fileName: file.name,
            totalRows: analysisResult.totalRows,
            totalPhoneNumbers: verifiedPhones.length,
            validNumbers,
            invalidNumbers,
            mobileNumbers,
            landlineNumbers,
            processedCount: verifiedPhones.length,
            totalCount: totalCount,
            originalData: originalData,
            selectedColumnIndex: selectedColumnIndex
        };

    } catch (error: any) {
        return {
            success: false,
            fileName: file.name,
            totalRows: 0,
            totalPhoneNumbers: 0,
            validNumbers: [],
            invalidNumbers: [],
            mobileNumbers: [],
            landlineNumbers: [],
            error: error?.message || "Unknown error occurred",
            originalData: undefined,
            selectedColumnIndex: selectedColumnIndex
        };
    }
};

export const exportToExcel = (
    data: VerifiedPhoneNumber[],
    filename: string,
    originalData?: any[][],
    selectedColumnIndex?: number
): void => {
    // Group verified phones by row number
    const phonesByRow = new Map<number, VerifiedPhoneNumber[]>();
    data.forEach((phone) => {
        if (!phonesByRow.has(phone.row)) {
            phonesByRow.set(phone.row, []);
        }
        phonesByRow.get(phone.row)!.push(phone);
    });

    // If we have original data, include all original columns
    if (originalData && originalData.length > 0) {
        const maxColumns = Math.max(...originalData.map(row => row.length), 0);
        const rowIndices = Array.from(phonesByRow.keys()).sort((a, b) => a - b);
        
        // Create header row with original columns + verification columns
        const headerRow: any[] = [];
        
        // Original column headers (A, B, C, etc.)
        for (let i = 0; i < maxColumns; i++) {
            headerRow.push(XLSX.utils.encode_col(i));
        }
        
        // Verification columns
        headerRow.push('Phone Number', 'Valid', 'Line Type', 'Country', 'Carrier', 'Location');

        // Prepare data rows
        const excelData: any[][] = [];
        
        rowIndices.forEach((rowNum) => {
            const rowIndex = rowNum - 1; // Convert to 0-based index
            const originalRow = originalData[rowIndex] || [];
            const phones = phonesByRow.get(rowNum) || [];
            
            // Create one row per phone number found in this row
            phones.forEach((phone) => {
                const row: any[] = [];
                
                // Add all original columns (same for all phones in this row)
                for (let i = 0; i < maxColumns; i++) {
                    row.push(originalRow[i] !== undefined ? originalRow[i] : '');
                }
                
                // Add verification data for this phone
                row.push(
                    phone.phoneNumber,
                    phone.valid ? 'Yes' : 'No',
                    phone.lineType || 'Unknown',
                    phone.countryName,
                    phone.carrier,
                    phone.location
                );
                
                excelData.push(row);
            });
        });

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...excelData]);

        // Set column widths
        const colWidths: { wch: number }[] = [];
        for (let i = 0; i < maxColumns; i++) {
            colWidths.push({ wch: 15 }); // Original columns
        }
        // Verification columns
        colWidths.push(
            { wch: 15 }, // Phone Number
            { wch: 8 },  // Valid
            { wch: 12 }, // Line Type
            { wch: 15 }, // Country
            { wch: 20 }, // Carrier
            { wch: 20 }  // Location
        );
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Phone Numbers');

        // Download file
        XLSX.writeFile(workbook, filename);
    } else {
        // Fallback to original format if no original data available
        const excelData = data.map((phone) => [
            phone.row,
            phone.originalValue,
            phone.phoneNumber,
            phone.valid ? 'Yes' : 'No',
            phone.lineType || 'Unknown',
            phone.countryName,
            phone.carrier,
            phone.location
        ]);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Row', 'Original Value', 'Phone Number', 'Valid', 'Line Type', 'Country', 'Carrier', 'Location'],
            ...excelData
        ]);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 6 },  // Row
            { wch: 20 }, // Original Value
            { wch: 15 }, // Phone Number
            { wch: 8 },  // Valid
            { wch: 12 }, // Line Type
            { wch: 15 }, // Country
            { wch: 20 }, // Carrier
            { wch: 20 }  // Location
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Phone Numbers');

        // Download file
        XLSX.writeFile(workbook, filename);
    }
};
