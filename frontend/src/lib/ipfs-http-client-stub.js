/** Stub for Next.js builds — real IPFS client is optional legacy credential tooling. */
export function create() {
  throw new Error(
    "ipfs-http-client is not available in the Next.js build. Set IPFS mode to 'simulate'.",
  );
}

export default { create };
