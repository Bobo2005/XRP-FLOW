/**
 * Turns viem/wagmi errors into plain, specific messages instead of raw
 * "execution reverted" strings or generic fallbacks.
 */
export function describeContractError(error: unknown): string {
  if (!error) return "Something went wrong.";

  const message = error instanceof Error ? error.message : String(error);

  if (/user rejected/i.test(message)) {
    return "You rejected the transaction in your wallet.";
  }
  if (/insufficient funds/i.test(message)) {
    return "Your wallet doesn't have enough C2FLR to cover gas for this transaction.";
  }
  if (/ZeroAmount/.test(message)) {
    return "Enter an amount greater than zero.";
  }
  if (/InsufficientDeposit/.test(message)) {
    return "You're trying to withdraw more than you have deposited.";
  }
  if (/KineticCallFailed/.test(message)) {
    return "There was an issue with the Kinetic market transaction. Please try again.";
  }
  if (/VenueMismatch/.test(message)) {
    return "Your existing deposit is in a different venue — top-ups stay in the venue you first deposited into.";
  }
  if (/NoRebalanceNeeded/.test(message)) {
    return "No rebalance needed: either you have no deposit, your deposit is too small (< 0.01 FXRP), or you're already in the best-yielding venue.";
  }
  if (/MorphoMarketNotConfigured/.test(message)) {
    return "Morpho market not configured. The contract owner needs to configure the Morpho market using setMorphoMarketParams() before Morpho transactions can be performed.";
  }
  if (/MorphoMarketAlreadyConfigured/.test(message)) {
    return "Morpho market already configured. The market can only be configured once.";
  }
  if (/transfer amount exceeds allowance|ERC20InsufficientAllowance/i.test(message)) {
    return "The router isn't approved to move that much FXRP yet — approve again.";
  }
  if (/transfer amount exceeds balance|ERC20InsufficientBalance/i.test(message)) {
    return "That's more FXRP than your wallet holds.";
  }
  if (/OwnableUnauthorizedAccount/.test(message)) {
    return "Only the contract owner can do that.";
  }
  if (/could not detect network|network changed|failed to fetch/i.test(message)) {
    return "Couldn't reach the Coston2 RPC. Check your connection and try again.";
  }

  // Fall back to the first line of the error, trimmed — avoids dumping a
  // full stack trace or ABI-encoded revert data into the UI.
  const firstLine = message.split("\n")[0].trim();
  return firstLine.length > 140
    ? "The transaction failed. Check your wallet for details."
    : firstLine;
}