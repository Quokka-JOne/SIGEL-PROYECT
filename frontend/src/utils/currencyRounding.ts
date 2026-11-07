export type RoundingMode = 'nearest_50' | 'nearest_100' | 'favor_cliente' | 'exact';

export interface RoundingResult {
  rawChange: number;
  roundedChange: number;
  roundingDifference: number; // roundedChange - rawChange
  mode: RoundingMode;
  modeLabel: string;
}

export function getRoundingModeLabel(mode: RoundingMode): string {
  switch (mode) {
    case 'nearest_50':
      return 'Al C$ 0.50 más cercano (50¢ mín. Nicaragua)';
    case 'nearest_100':
      return 'Al C$ 1.00 entero más cercano';
    case 'favor_cliente':
      return 'A favor del cliente (Hacia arriba 50¢)';
    case 'exact':
      return 'Sin redondeo (Centavos exactos)';
    default:
      return 'Al C$ 0.50 más cercano';
  }
}

/**
 * Calcula el cambio en efectivo aplicando redondeo comercial de denominación monetaria.
 * En Nicaragua no existen monedas de 1¢, 5¢, 10¢ ni 25¢. La moneda mínima es C$ 0.50 (50 centavos).
 */
export function calculateCashChange(
  effectivePaid: number,
  total: number,
  mode: RoundingMode = 'nearest_50'
): RoundingResult {
  if (effectivePaid <= total) {
    return {
      rawChange: 0,
      roundedChange: 0,
      roundingDifference: 0,
      mode,
      modeLabel: getRoundingModeLabel(mode),
    };
  }

  const rawChange = Number((effectivePaid - total).toFixed(2));
  let roundedChange = rawChange;

  switch (mode) {
    case 'nearest_50':
      // Redondeo comercial a la moneda mínima en circulación en Nicaragua (C$ 0.50)
      roundedChange = Number((Math.round(rawChange * 2) / 2).toFixed(2));
      break;
    case 'nearest_100':
      // Redondeo al córdoba entero más cercano (C$ 1.00)
      roundedChange = Number(Math.round(rawChange).toFixed(2));
      break;
    case 'favor_cliente':
      // Redondeo hacia arriba al C$ 0.50 superior (a favor del cliente)
      roundedChange = Number((Math.ceil(rawChange * 2) / 2).toFixed(2));
      break;
    case 'exact':
    default:
      roundedChange = rawChange;
      break;
  }

  const roundingDifference = Number((roundedChange - rawChange).toFixed(2));

  return {
    rawChange,
    roundedChange,
    roundingDifference,
    mode,
    modeLabel: getRoundingModeLabel(mode),
  };
}

