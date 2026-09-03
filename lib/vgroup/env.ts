export type VGroupRuntimeConfig = {
  databaseUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  environment: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Vivit Group runtime`);
  return value;
}

export function getVGroupRuntimeConfig(): VGroupRuntimeConfig {
  const config = {
    databaseUrl: required("VGROUP_DATABASE_URL"),
    supabaseUrl: required("VGROUP_SUPABASE_URL"),
    publishableKey: required("VGROUP_SUPABASE_PUBLISHABLE_KEY"),
    environment: process.env.VGROUP_ENVIRONMENT || "development",
  };

  const forbiddenPairs: Array<[string, string, string]> = [
    [config.databaseUrl, process.env.DATABASE_URL || "", "database"],
    [config.supabaseUrl, process.env.SUPABASE_URL || "", "supabase project"],
    [config.publishableKey, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", "publishable key"],
  ];
  for (const [groupValue, marketingValue, label] of forbiddenPairs) {
    if (marketingValue && groupValue === marketingValue) {
      throw new Error(`Vivit Group isolation violation: ${label} credential is shared with Marketing`);
    }
  }

  return config;
}

export function isVGroupConfigured(): boolean {
  try {
    getVGroupRuntimeConfig();
    return true;
  } catch {
    return false;
  }
}
