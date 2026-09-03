export type VGroupRuntimeConfig = {
  databaseUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  serviceKey: string;
  environment: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Vivit Group runtime`);
  return value;
}

function validateIsolation(groupValue: string, marketingValue: string, label: string) {
  if (marketingValue && groupValue === marketingValue) {
    throw new Error(`Vivit Group isolation violation: ${label} credential is shared with Marketing`);
  }
}

export function getVGroupRuntimeConfig(): VGroupRuntimeConfig {
  const config = {
    databaseUrl: required("VGROUP_DATABASE_URL"),
    supabaseUrl: required("VGROUP_SUPABASE_URL"),
    publishableKey: required("VGROUP_SUPABASE_PUBLISHABLE_KEY"),
    serviceKey: required("VGROUP_SUPABASE_SERVICE_KEY"),
    environment: process.env.VGROUP_ENVIRONMENT || "development",
  };

  validateIsolation(config.databaseUrl, process.env.DATABASE_URL || "", "database");
  validateIsolation(config.supabaseUrl, process.env.SUPABASE_URL || "", "supabase project");
  validateIsolation(config.publishableKey, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", "publishable key");
  validateIsolation(config.serviceKey, process.env.SUPABASE_SERVICE_KEY || "", "service key");
  return config;
}

export function isVGroupConfigured(): boolean {
  try {
    const databaseUrl = required("VGROUP_DATABASE_URL");
    const supabaseUrl = required("VGROUP_SUPABASE_URL");
    const publishableKey = required("VGROUP_SUPABASE_PUBLISHABLE_KEY");
    validateIsolation(databaseUrl, process.env.DATABASE_URL || "", "database");
    validateIsolation(supabaseUrl, process.env.SUPABASE_URL || "", "supabase project");
    validateIsolation(publishableKey, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", "publishable key");
    return true;
  } catch {
    return false;
  }
}
