export const BASE_URL = import.meta.env.VITE_BASE_URL;

/**
 * Formats a date string to MM DD YYYY format
 * @param dateString - Date string in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted date string in MM DD YYYY format
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  
  // Handle both ISO date strings and date-only strings
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return dateString;
  
  // Format as MM DD YYYY
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month} ${day} ${year}`;
};
