import { useEffect, useState } from "react";

type WalletHook = {
  account: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const LOCAL_KEY = "wallet.connected";

export default function useWallet(): WalletHook {
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handleAccounts = (accounts: string[] | string) => {
      // accounts may be an array (modern) or a single string in some events
      if (Array.isArray(accounts)) {
        setAccount(accounts && accounts.length ? accounts[0] : null);
        if (accounts && accounts.length) localStorage.setItem(LOCAL_KEY, "1");
        else localStorage.removeItem(LOCAL_KEY);
      } else if (typeof accounts === "string") {
        setAccount(accounts || null);
        if (accounts) localStorage.setItem(LOCAL_KEY, "1");
        else localStorage.removeItem(LOCAL_KEY);
      } else {
        setAccount(null);
        localStorage.removeItem(LOCAL_KEY);
      }
    };

    // query current accounts (does not prompt)
    try {
      eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        handleAccounts(accounts);
      }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // sometimes selectedAddress is available
    if (eth.selectedAddress) {
      setAccount(eth.selectedAddress);
      localStorage.setItem(LOCAL_KEY, "1");
    }

    // If the user previously connected, try to re-request accounts to re-establish connection.
    // This may prompt the wallet UI; it's expected when persisting a connection across reloads.
    try {
      if (!eth.selectedAddress && !account && localStorage.getItem(LOCAL_KEY)) {
        eth.request({ method: "eth_requestAccounts" }).then((accounts: string[]) => {
          handleAccounts(accounts);
        }).catch(() => {
          // user may reject — remove stored flag
          localStorage.removeItem(LOCAL_KEY);
        });
      }
    } catch (e) {
      // ignore
    }

    // listen for account changes
    if (eth.on) eth.on("accountsChanged", handleAccounts);

    return () => {
      if (eth.removeListener) eth.removeListener("accountsChanged", handleAccounts);
    };
  }, []);

  const connect = async () => {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No injected ethereum provider detected");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accounts && accounts.length ? accounts[0] : null);
    if (accounts && accounts.length) localStorage.setItem(LOCAL_KEY, "1");
  };

  const disconnect = () => {
    // There is no standard programmatic "disconnect" for injected wallets (e.g. MetaMask).
    // Emulate a disconnect from the dapp side by clearing the stored account and
    // removing the persisted flag. The wallet will still show the site as connected until
    // the user revokes permissions in the wallet UI (this is by design).
    setAccount(null);
    localStorage.removeItem(LOCAL_KEY);
  };

  return { account, connect, disconnect };
}
