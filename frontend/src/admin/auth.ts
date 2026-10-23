// MOCK sign-in for the dashboard prototype. It only remembers an email in sessionStorage so the pages can be
// shown or hidden; it is NOT authentication and protects nothing. Real sign-in will use the backend's Identity
// cookie auth.

const KEY = "phuan-admin-mock-session";

export function getSession(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function startSession(email: string) {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // blocked storage: the guard will send the user back to the sign-in page
  }
}

export function endSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
