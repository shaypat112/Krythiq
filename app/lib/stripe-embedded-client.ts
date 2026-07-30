"use client";

type EmbeddedCheckout = {
  mount: (target: string) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    Stripe?: (key: string) => {
      initEmbeddedCheckout: (options: {
        fetchClientSecret: () => Promise<string>;
      }) => Promise<EmbeddedCheckout>;
    };
  }
}

let stripeScriptPromise: Promise<void> | null = null;
let checkoutOperation: Promise<void> = Promise.resolve();
let activeCheckout: EmbeddedCheckout | null = null;

function loadStripeScript() {
  if (window.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;

  stripeScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.stripe.com/clover/stripe.js"]',
    );
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Unable to load Stripe's secure payment form.")),
      { once: true },
    );

    if (!existing) {
      script.src = "https://js.stripe.com/clover/stripe.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    stripeScriptPromise = null;
    throw error;
  });

  return stripeScriptPromise;
}

function serializeCheckoutOperation<T>(operation: () => Promise<T>) {
  const result = checkoutOperation.then(operation, operation);
  checkoutOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function mountStripeCheckout({
  clientSecret,
  publishableKey,
  target,
  signal,
}: {
  clientSecret: string;
  publishableKey: string;
  target: string;
  signal: AbortSignal;
}) {
  return serializeCheckoutOperation(async () => {
    if (signal.aborted) return null;
    if (!publishableKey.startsWith("pk_test_")) {
      throw new Error(
        "Live payments are disabled. Configure a Stripe test publishable key.",
      );
    }

    await loadStripeScript();
    if (signal.aborted) return null;
    if (!window.Stripe) throw new Error("Stripe payment form is unavailable.");

    activeCheckout?.destroy();
    activeCheckout = null;

    const checkout = await window
      .Stripe(publishableKey)
      .initEmbeddedCheckout({
        fetchClientSecret: async () => clientSecret,
      });

    if (signal.aborted) {
      checkout.destroy();
      return null;
    }

    checkout.mount(target);
    activeCheckout = checkout;
    return checkout;
  });
}

export function destroyStripeCheckout(checkout: EmbeddedCheckout | null) {
  return serializeCheckoutOperation(async () => {
    if (!checkout) return;
    checkout.destroy();
    if (activeCheckout === checkout) activeCheckout = null;
  });
}
