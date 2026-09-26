"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { studionet } from "genlayer-js/chains";
import { createClient } from "genlayer-js";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts?.[0]) setAccount(accounts[0]);
    }).catch(() => {});

    const onAccountsChanged = (accounts) => setAccount(accounts?.[0] || "");
    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", onAccountsChanged);
  }, []);

  async function connectWallet() {
    if (!window.ethereum) throw new Error("Please install MetaMask or another Web3 wallet.");
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("No wallet account found.");
      setAccount(accounts[0]);
      try {
        const client = createClient({ chain: studionet, account: accounts[0], provider: window.ethereum });
        await client.connect("studionet");
      } catch {
        // Wallet may already be connected to Studionet.
      }
      return accounts[0];
    } finally {
      setConnecting(false);
    }
  }

  const value = useMemo(() => ({ account, connecting, connectWallet }), [account, connecting]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
