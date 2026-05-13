import "@testing-library/jest-dom";

// Provide required env vars for any test that imports modules which fail
// fast on missing secrets (auth.ts, affiliate.ts hashIp, etc.). Tests that
// want to assert the "missing" behavior can vi.stubEnv inside their case.
process.env.NEXTAUTH_SECRET ||= "test-nextauth-secret-do-not-use-in-production";
process.env.IP_SALT ||= "test-ip-salt-do-not-use-in-production";
process.env.CRON_SECRET ||= "test-cron-secret";
