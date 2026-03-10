// ─── PIN Generation ──────────────────────────────────────────────────────────

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Role Distribution ───────────────────────────────────────────────────────

export interface RoleAssignment {
  playerId: string;
  role: 'buyer' | 'seller';
  secretValue: number;
}

/**
 * Randomly divides players into buyers and sellers and assigns secret values.
 *
 * Baseline ranges (from PRD):
 *   Buyers  – max willingness to pay:   $95 – $140
 *   Sellers – min willingness to accept: $50 – $95
 *
 * Market shocks shift these ranges up or down for the next round.
 */
export function distributeRoles(
  playerIds: string[],
  shifts: { supplyShift?: number; demandShift?: number } = {}
): RoleAssignment[] {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const sellerCount = Math.floor(shuffled.length / 2);
  const { supplyShift = 0, demandShift = 0 } = shifts;

  return shuffled.map((playerId, index) => {
    const isSeller = index < sellerCount;

    if (isSeller) {
      const base = 50 + Math.floor(Math.random() * 46); // $50–$95
      const secretValue = clamp(Math.round(base + supplyShift), 10, 250);
      return { playerId, role: 'seller', secretValue };
    } else {
      const base = 95 + Math.floor(Math.random() * 46); // $95–$140
      const secretValue = clamp(Math.round(base + demandShift), 50, 300);
      return { playerId, role: 'buyer', secretValue };
    }
  });
}

// ─── Surplus Calculation ─────────────────────────────────────────────────────

/**
 * Consumer surplus = Max Willingness to Pay − Transaction Price
 * Producer surplus = Transaction Price − Min Willingness to Accept
 */
export function calculateSurplus(
  role: 'buyer' | 'seller',
  secretValue: number,
  price: number
): number {
  const raw = role === 'buyer' ? secretValue - price : price - secretValue;
  return Math.round(raw * 100) / 100;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
