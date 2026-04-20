/**
 * Utility for robust data validation
 */

/**
 * Check if an email is structurally valid and not a common typo
 * @param email The email string to validate
 * @returns { isValid: boolean, error?: string, suggestion?: string }
 */
export function validateEmail(email: string): { isValid: boolean; error?: string; suggestion?: string } {
  if (!email) {
    return { isValid: false, error: "Email không được để trống." };
  }

  // Strict Regex for structural validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Định dạng email không hợp lệ (ví dụ: name@example.com)." };
  }

  const [localPart, domain] = email.split("@");
  const d = domain.toLowerCase();

  // Typo detection for common providers
  const typos: Record<string, string> = {
    "gmai.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.con": "gmail.com",
    "yaho.com": "yahoo.com",
    "yaho.com.vn": "yahoo.com.vn",
    "hotmai.com": "hotmail.com",
    "outloook.com": "outlook.com",
    "icloud.con": "icloud.com",
  };

  if (typos[d]) {
    return { 
      isValid: false, 
      error: `Tên miền "@${d}" có vẻ bị sai chính tả.`,
      suggestion: typos[d]
    };
  }

  // Basic check for very short or obviously fake domains
  if (d.length < 4 || !d.includes(".")) {
    return { isValid: false, error: "Tên miền email không hợp lệ." };
  }

  return { isValid: true };
}
