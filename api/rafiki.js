const { createHmac } = require("crypto");

function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const sorted = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);

  return `{${sorted.join(",")}}`;
}

function buildSignature(body, secret, version) {
  const timestamp = Date.now();
  const payload = `${timestamp}.${canonicalize(body)}`;
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp}, v${version}=${digest}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rafikiUrl =
    process.env.RAFIKI_GRAPHQL_URL ||
    process.env.EXPO_PUBLIC_RAFIKI_GRAPHQL_URL ||
    "";
  const rafikiApiKey = process.env.RAFIKI_API_KEY || "";
  const rafikiTenantId =
    process.env.RAFIKI_TENANT_ID || process.env.EXPO_PUBLIC_RAFIKI_TENANT_ID || "";
  const signatureVersion =
    process.env.RAFIKI_SIGNATURE_VERSION ||
    process.env.EXPO_PUBLIC_RAFIKI_SIGNATURE_VERSION ||
    "1";

  if (!rafikiUrl) {
    return res.status(500).json({ error: "RAFIKI_GRAPHQL_URL is not configured" });
  }

  const body = req.body || {};
  if (!body.query || typeof body.query !== "string") {
    return res.status(400).json({ error: "Missing GraphQL query" });
  }

  const upstreamBody = { query: body.query };
  if (body.variables && typeof body.variables === "object") {
    upstreamBody.variables = body.variables;
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (rafikiApiKey) {
    headers.signature = buildSignature(upstreamBody, rafikiApiKey, signatureVersion);
  }

  if (rafikiTenantId) {
    headers["tenant-id"] = rafikiTenantId;
  }

  try {
    const upstreamResponse = await fetch(rafikiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(upstreamBody),
    });

    const text = await upstreamResponse.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = {
        errors: [{ message: text || "Invalid JSON response from Rafiki" }],
      };
    }

    return res.status(upstreamResponse.status).json(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected backend error";
    return res.status(502).json({ errors: [{ message }] });
  }
};
