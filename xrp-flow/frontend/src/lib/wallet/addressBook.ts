import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACTS, isDeployed } from "../../contracts";
import { coston2 } from "../../wagmi";

interface AddressBookEntry {
  id: string;
  name: string;
  address: `0x${string}`;
  createdAt: number;
  tags: string[];
}

interface AddressBookState {
  entries: AddressBookEntry[];
  loading: boolean;
  error: Error | null;
  // Operations
  addEntry: (entry: Omit<AddressBookEntry, "id" | "createdAt">) => Promise<void>;
  updateEntry: (id: string, updates: Partial<Omit<AddressBookEntry, "id" | "createdAt">>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  getEntry: (id: string) => AddressBookEntry | undefined;
  getEntriesByTag: (tag: string) => AddressBookEntry[];
  // Validation
  isValidAddress: (address: string) => boolean;
}

// Local storage key
const ADDRESS_BOOK_KEY = "xrpflow.addressBook";

// Default address book entries (common addresses)
const DEFAULT_ENTRIES: AddressBookEntry[] = [
  {
    id: "yield-router",
    name: "Yield Router",
    address: CONTRACTS.yieldRouter.address as `0x${string}`,
    createdAt: Date.now(),
    tags: ["contract", "yield"],
  },
  {
    id: "fxrp-token",
    name: "FXRP Token",
    address: CONTRACTS.fxrp.address as `0x${string}`,
    createdAt: Date.now(),
    tags: ["token", "fxrp"],
  },
];

// Initialize address book from local storage or defaults
function loadAddressBook(): AddressBookEntry[] {
  try {
    const saved = localStorage.getItem(ADDRESS_BOOK_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate structure
      if (Array.isArray(parsed)) {
        return parsed.map((entry: any) => ({
          ...entry,
          createdAt: entry.createdAt || Date.now(),
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to load address book from localStorage", err);
  }
  return DEFAULT_ENTRIES;
}

// Save address book to local storage
function saveAddressBook(entries: AddressBookEntry[]) {
  try {
    localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to save address book to localStorage", err);
  }
}

export function useAddressBook() {
  const { address: userAddress } = useAccount();
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load address book on mount
  useEffect(() => {
    const loadBook = () => {
      setLoading(true);
      try {
        const book = loadAddressBook();
        setEntries(book);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setEntries(DEFAULT_ENTRIES); // Fallback to defaults
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, []);

  // Validate Ethereum address
  const isValidAddress = useCallback((address: string): boolean => {
    if (!address) return false;
    // Basic Ethereum address regex (0x followed by 40 hex characters)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }, []);

  // Add new entry
  const addEntry = useCallback(
    async (entry: Omit<AddressBookEntry, "id" | "createdAt">) => {
      if (!isValidAddress(entry.address)) {
        throw new Error("Invalid Ethereum address");
      }

      setLoading(true);
      try {
        const newEntry: AddressBookEntry = {
          ...entry,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
        };

        setEntries((prev) => [...prev, newEntry]);
        saveAddressBook([...entries, newEntry]);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [entries, isValidAddress]
  );

  // Update existing entry
  const updateEntry = useCallback(
    async (id: string, updates: Partial<Omit<AddressBookEntry, "id" | "createdAt">>) => {
      if (updates.address && !isValidAddress(updates.address)) {
        throw new Error("Invalid Ethereum address");
      }

      setLoading(true);
      try {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        );
        saveAddressBook(
          entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          )
        );
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [entries, isValidAddress]
  );

  // Remove entry
  const removeEntry = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
        saveAddressBook(entries.filter((entry) => entry.id !== id));
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [entries]
  );

  // Get entry by ID
  const getEntry = useCallback((id: string): AddressBookEntry | undefined => {
    return entries.find((entry) => entry.id === id);
  }, [entries]);

  // Get entries by tag
  const getEntriesByTag = useCallback(
    (tag: string): AddressBookEntry[] => {
      return entries.filter((entry) => entry.tags.includes(tag));
    },
    [entries]
  );

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    removeEntry,
    getEntry,
    getEntriesByTag,
    isValidAddress,
    // Convenience methods
    getDefaultEntries: () => DEFAULT_ENTRIES,
    resetToDefaults: async () => {
      setLoading(true);
      try {
        setEntries(DEFAULT_ENTRIES);
        saveAddressBook(DEFAULT_ENTRIES);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
  };
}

// Hook for getting user's own address book entry (if they've saved themselves)
export function useMyAddressEntry(addressBook: ReturnType<typeof useAddressBook>) {
  const { address: userAddress } = useAccount();
  const { entries, isValidAddress } = addressBook;

  // Find entry matching user's address
  const myEntry =
    userAddress && isValidAddress(userAddress)
      ? entries.find((entry) => entry.address.toLowerCase() === userAddress.toLowerCase())
      : undefined;

  return {
    myEntry,
    isSaved: !!myEntry,
    saveAsLabel: (name: string, tags: string[] = []) => {
      if (!userAddress || !isValidAddress(userAddress)) {
        throw new Error("Invalid or missing wallet address");
      }

      return addressBook.updateEntry(
        myEntry?.id || "",
        {
          name,
          tags: [...tags, "self"],
        }
      );
    },
  };
}