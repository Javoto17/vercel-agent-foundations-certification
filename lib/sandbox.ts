import { Sandbox } from "@vercel/sandbox";

export const SANDBOX_NAME = "admin-agent-sandbox";

export const createOrGetSandbox = async (name: string) => {
  try {
    return await Sandbox.get({ name });
  } catch {
    return await Sandbox.create({
      name,
      // Named sandboxes persist by default and snapshot when stopped.
      snapshotExpiration: 7 * 24 * 60 * 60 * 1000,
      timeout: 2_700_000,
    });
  }
};
