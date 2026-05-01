/**
 * Formats a number or string into a thousand-separated string (e.g., 1000 -> "1.000").
 */
export const formatCurrencyInput = (value: string): string => {
    // Remove non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    
    // Format with dots every 3 digits
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Strips formatting (dots) to get a plain number for calculations/storage.
 */
export const parseCurrencyInput = (formattedValue: string): number => {
    const plainValue = formattedValue.replace(/\./g, '');
    return parseFloat(plainValue) || 0;
};
