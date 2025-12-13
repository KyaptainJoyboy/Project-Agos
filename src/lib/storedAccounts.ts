export interface StoredAccount {
  email: string;
  fullName: string;
  lastUsed: string;
}

const STORAGE_KEY = 'agos_stored_accounts';
const MAX_STORED_ACCOUNTS = 5;

export function getStoredAccounts(): StoredAccount[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveAccount(email: string, fullName: string): void {
  try {
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(acc => acc.email === email);

    const newAccount: StoredAccount = {
      email,
      fullName,
      lastUsed: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = newAccount;
    } else {
      accounts.unshift(newAccount);
    }

    accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

    const limitedAccounts = accounts.slice(0, MAX_STORED_ACCOUNTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedAccounts));
  } catch (error) {
    console.error('Failed to save account:', error);
  }
}

export function removeStoredAccount(email: string): void {
  try {
    const accounts = getStoredAccounts();
    const filtered = accounts.filter(acc => acc.email !== email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove account:', error);
  }
}
