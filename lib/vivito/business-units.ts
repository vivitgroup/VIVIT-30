export const VIVITO_BUSINESS_UNITS = ["group", "marketing", "hospitality", "tech", "shared"] as const;

export type VivitoBusinessUnit = (typeof VIVITO_BUSINESS_UNITS)[number];

export type VivitoBusinessUnitResolution = {
  unit: VivitoBusinessUnit | null;
  confidence: "explicit" | "context" | "ambiguous" | "none";
  matchedAlias?: string;
  candidates: VivitoBusinessUnit[];
};

export type VivitoBusinessUnitDefinition = {
  code: VivitoBusinessUnit;
  label: string;
  aliases: readonly string[];
  scope: "group" | "business_unit" | "shared";
};

export const VIVITO_BUSINESS_UNIT_REGISTRY: Readonly<Record<VivitoBusinessUnit, VivitoBusinessUnitDefinition>> = {
  group: {
    code: "group",
    label: "VIVIT Group",
    aliases: ["vivit group", "vgroup", "group", "الجروب", "المجموعة", "فيفيت جروب"],
    scope: "group",
  },
  marketing: {
    code: "marketing",
    label: "VIVIT Marketing",
    aliases: ["vivit marketing", "marketing", "ماركتنج", "الماركتنج", "التسويق", "فيفيت ماركتنج"],
    scope: "business_unit",
  },
  hospitality: {
    code: "hospitality",
    label: "VIVIT Hospitality",
    aliases: ["vivit hospitality", "hospitality", "هوسبتليتي", "الهوسبتليتي", "الضيافة", "فيفيت هوسبتليتي"],
    scope: "business_unit",
  },
  tech: {
    code: "tech",
    label: "VIVIT Tech",
    aliases: ["vivit tech", "tech", "technology", "تك", "التك", "تكنولوجيا", "فيفيت تك"],
    scope: "business_unit",
  },
  shared: {
    code: "shared",
    label: "VIVIT Shared Services",
    aliases: ["shared services", "shared", "خدمات مشتركة", "الخدمات المشتركة", "hr", "human resources", "موارد بشرية"],
    scope: "shared",
  },
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function aliasMatches(normalizedText: string, alias: string) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) return false;
  return (` ${normalizedText} `).includes(` ${normalizedAlias} `);
}

export function resolveVivitoBusinessUnit(
  text: string,
  contextUnit?: VivitoBusinessUnit | null,
): VivitoBusinessUnitResolution {
  const normalizedText = normalize(text);
  const matches: Array<{ unit: VivitoBusinessUnit; alias: string }> = [];

  for (const unit of VIVITO_BUSINESS_UNITS) {
    for (const alias of VIVITO_BUSINESS_UNIT_REGISTRY[unit].aliases) {
      if (aliasMatches(normalizedText, alias)) matches.push({ unit, alias });
    }
  }

  const candidates = [...new Set(matches.map((match) => match.unit))];

  if (candidates.length === 1) {
    const match = matches.find((item) => item.unit === candidates[0]);
    return {
      unit: candidates[0],
      confidence: "explicit",
      matchedAlias: match?.alias,
      candidates,
    };
  }

  if (candidates.length > 1) {
    return { unit: null, confidence: "ambiguous", candidates };
  }

  if (contextUnit) {
    return { unit: contextUnit, confidence: "context", candidates: [contextUnit] };
  }

  return { unit: null, confidence: "none", candidates: [] };
}

export function buildVivitoBusinessUnitPrompt() {
  return VIVITO_BUSINESS_UNITS.map((unit) => {
    const definition = VIVITO_BUSINESS_UNIT_REGISTRY[unit];
    return `${definition.code}=${definition.label}`;
  }).join(", ");
}

export function assertVivitoBusinessUnitResolved(
  resolution: VivitoBusinessUnitResolution,
): asserts resolution is VivitoBusinessUnitResolution & { unit: VivitoBusinessUnit } {
  if (!resolution.unit) {
    const detail = resolution.confidence === "ambiguous"
      ? `ambiguous:${resolution.candidates.join(",")}`
      : "missing";
    throw new Error(`vivito_business_unit_unresolved:${detail}`);
  }
}
