// Which security backend this build talks to. "tide" (default) is the real TideCloak realm and Tide
// network. "simulated" swaps both for local stand-ins (src/sim/) so the app can be demonstrated while
// the realm cannot enrol users. Simulated results are never evidence of Tide enforcement.
export const SIMULATED = process.env.NEXT_PUBLIC_CARE_PASSPORT_MODE === "simulated";
