export type IlpErrorClass = "final" | "temporary" | "relative" | "unknown";

export interface ParsedIlpError {
  code: string | null;
  errorClass: IlpErrorClass;
  userMessage: string;
  shouldRetry: boolean;
}

const ILP_CODE_MESSAGE_MAP: Record<string, string> = {
  F00: "The payment request was invalid.",
  F01: "The payment packet was invalid.",
  F02: "We could not find a route to the recipient.",
  F03: "The payment amount was not valid.",
  F04: "The destination amount was too low for the recipient.",
  F05: "Payment security check failed. Please try again.",
  F06: "The recipient could not accept this payment format.",
  F07: "The recipient cannot receive this payment right now.",
  F08: "The transfer amount is too large for this route.",
  T00: "Temporary processing issue. Please try again shortly.",
  T01: "A payment network was temporarily unreachable.",
  T02: "A payment connector is busy. Try again in a moment.",
  T03: "The payment route is currently busy. Try again soon.",
  T04: "Temporary liquidity issue. Please retry shortly.",
  T05: "Too many requests right now. Please retry in a moment.",
  R00: "Payment timed out. Try again with a little more time.",
  R01: "The source amount was not enough after conversion.",
  R02: "The payment timeout was too short.",
};

export function parseIlpError(errorText?: string | null): ParsedIlpError {
  const text = (errorText ?? "").trim();
  const match = text.match(/\b([FTR]\d{2})\b/i);
  const code = match?.[1]?.toUpperCase() ?? null;

  if (!code) {
    return {
      code: null,
      errorClass: "unknown",
      userMessage: text || "Payment failed. Please try again.",
      shouldRetry: true,
    };
  }

  const prefix = code[0];
  const errorClass: IlpErrorClass =
    prefix === "F" ? "final" : prefix === "T" ? "temporary" : "relative";

  return {
    code,
    errorClass,
    userMessage:
      ILP_CODE_MESSAGE_MAP[code] ??
      (errorClass === "final"
        ? "This payment cannot be completed with the current details."
        : "This payment failed due to a temporary network condition."),
    shouldRetry: errorClass !== "final",
  };
}

export function formatIlpErrorForDisplay(errorText?: string | null): string {
  const parsed = parseIlpError(errorText);
  if (!parsed.code) {
    return parsed.userMessage;
  }
  return `${parsed.userMessage} (${parsed.code})`;
}
