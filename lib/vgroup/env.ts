export type VGroupRuntimeConfig = {
  databaseUrl: string;
  supabaseUrl: string;
  serviceKey: string;
  authSecret: string;
  environment: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Vivit Group runtime`);
  return value;
}

export function getVGroupRuntimeConfig(): VGroupRuntimeConfig {
  const config = {
    databaseUrl: required("VGROUP_DATABASE_URL"),
    supabaseUrl: required("VGROUP_SUPABASE_URL"),
    serviceKey: required("VGROUP_SUPABASE_SERVICE_KEY"),
    authSecret: required("VGROUP_AUTH_SECRET"),
    environment: process.env.VGROUP_ENVIRONMENT || "development",
  };

  const forbiddenPairs: Array<[string, string, string]> = [
    [config.databaseUrl, process.env.DATABASE_URL || "", "database"],
    [config.supabaseUrl, process.env.SUPABASE_URL || "", "supabase project"],
    [config.serviceKey, process.env.SUPABASE_SERVICE_KEY || "", "service key"],
    [config.authSecret, process.env.AUTH_SECRET || "", "auth secret"],
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
