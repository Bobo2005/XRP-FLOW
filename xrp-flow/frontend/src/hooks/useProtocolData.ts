import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { 
  CONTRACTS, 
  isDeployed, 
  tierNameFromIndex, 
  venueNameFromIndex 
} from "../contracts";

export function useProtocolData() {
  const { address } = useAccount();

  const { data, refetch, isLoading, isError } = useReadContracts({
    contracts: [
      { ...CONTRACTS.yieldRouter, functionName: "getCurrentAPY" },
      { ...CONTRACTS.yieldRouter, functionName: "kineticMockAPY" },
      { ...CONTRACTS.yieldRouter, functionName: "morphoMockAPY" },
      { ...CONTRACTS.yieldRouter, functionName: "getBestVenue" },
      // User-specific data (only runs if address is connected)
      { ...CONTRACTS.yieldRouter, functionName: "getReputationTier", args: [address || "0x0000000000000000000000000000000000000000"] },
      { ...CONTRACTS.yieldRouter, functionName: "userVenue", args: [address || "0x0000000000000000000000000000000000000000"] },
    ],
    // Only execute if the contracts are actually deployed
    query: { enabled: isDeployed },
  });

  const [
    currentApyData,
    kineticApyData,
    morphoApyData,
    bestVenueData,
    reputationTierData,
    userVenueData,
  ] = data || [];

  // Format APYs (assuming they are returned as standard base points or 18 decimals)
  // Adjust the '18' below if your contract uses a different precision for APY percentages
  const currentApy = currentApyData?.result ? Number(formatUnits(currentApyData.result as bigint, 18)) : 0;
  const kineticApy = kineticApyData?.result ? Number(formatUnits(kineticApyData.result as bigint, 18)) : 0;
  const morphoApy = morphoApyData?.result ? Number(formatUnits(morphoApyData.result as bigint, 18)) : 0;

  // Resolve Enums using the helper functions from your contracts.ts
  const bestVenue = bestVenueData?.result !== undefined 
    ? venueNameFromIndex(bestVenueData.result as number) 
    : "Kinetic";
    
  const userVenue = userVenueData?.result !== undefined 
    ? venueNameFromIndex(userVenueData.result as number) 
    : null;

  const reputationTier = reputationTierData?.result !== undefined 
    ? tierNameFromIndex(reputationTierData.result as number) 
    : "None";

  return {
    apy: {
      current: currentApy,
      kinetic: kineticApy,
      morpho: morphoApy,
    },
    venues: {
      best: bestVenue,
      userCurrent: userVenue,
    },
    user: {
      tier: reputationTier,
    },
    isLoading,
    isError,
    refetch,
  };
}