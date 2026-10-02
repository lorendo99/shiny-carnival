import { ReplitConnectors } from "@replit/connectors-sdk";

type Collection<T> = { items?: T[] };
type Resource = {
  id: string;
  app_id?: string;
  lookup_key?: string;
  store_identifier?: string;
  is_current?: boolean;
  type?: string;
};

const projectId = process.env.REVENUECAT_PROJECT_ID;
const testStoreAppId = process.env.REVENUECAT_TEST_STORE_APP_ID;

if (!projectId || !testStoreAppId) {
  throw new Error("RevenueCat project and Test Store app configuration are required.");
}

const connectors = new ReplitConnectors();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await connectors.proxy("revenuecat", `/v2${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!response.ok) {
    throw new Error(`RevenueCat ${init?.method ?? "GET"} ${path} failed (${response.status}): ${await response.text()}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function list<T>(path: string): Promise<T[]> {
  return (await request<Collection<T>>(`${path}?limit=100`)).items ?? [];
}

async function ensureProduct(
  products: Resource[],
  storeIdentifier: string,
  displayName: string,
  title: string,
  duration: "P1M" | "P1Y",
  amountMicros: number,
) {
  let product = products.find(
    (item) => item.app_id === testStoreAppId && item.store_identifier === storeIdentifier,
  );
  if (!product) {
    product = await request<Resource>(`/projects/${projectId}/products`, {
      method: "POST",
      body: JSON.stringify({
        store_identifier: storeIdentifier,
        app_id: testStoreAppId,
        type: "subscription",
        display_name: displayName,
        title,
        subscription: { duration },
      }),
    });
    await request(`/projects/${projectId}/products/${product.id}/test_store_prices`, {
      method: "POST",
      body: JSON.stringify({
        prices: [{ amount_micros: amountMicros, currency: "USD" }],
      }),
    });
  }
  return product;
}

async function ensurePackage(offeringId: string, packages: Resource[], lookupKey: string, displayName: string) {
  const existing = packages.find((item) => item.lookup_key === lookupKey);
  if (existing) return existing;
  return request<Resource>(`/projects/${projectId}/offerings/${offeringId}/packages`, {
    method: "POST",
    body: JSON.stringify({ lookup_key: lookupKey, display_name: displayName }),
  });
}

async function attachedProducts(packageId: string) {
  const items = await list<Resource & { product?: Resource }>(
    `/projects/${projectId}/packages/${packageId}/products`,
  );
  return items.map((item) => item.product ?? item);
}

async function configure() {
  const [products, entitlements, offerings] = await Promise.all([
    list<Resource>(`/projects/${projectId}/products`),
    list<Resource>(`/projects/${projectId}/entitlements`),
    list<Resource>(`/projects/${projectId}/offerings`),
  ]);

  const entitlement = entitlements.find((item) => item.lookup_key === "fixmate_plus");
  if (!entitlement) throw new Error("The fixmate_plus entitlement was not found.");
  const offering = offerings.find((item) => item.is_current) ?? offerings.find((item) => item.lookup_key === "default");
  if (!offering) throw new Error("A current RevenueCat offering was not found.");

  const monthly = await ensureProduct(
    products,
    "fixmate_plus_monthly_999",
    "FixMate Plus Monthly 9.99",
    "FixMate Plus Monthly",
    "P1M",
    9_990_000,
  );
  const annual = await ensureProduct(
    products,
    "fixmate_plus_annual_6999",
    "FixMate Plus Annual 69.99",
    "FixMate Plus Annual",
    "P1Y",
    69_990_000,
  );

  await request(`/projects/${projectId}/entitlements/${entitlement.id}/actions/attach_products`, {
    method: "POST",
    body: JSON.stringify({ product_ids: [monthly.id, annual.id] }),
  });

  const existingPackages = await list<Resource>(
    `/projects/${projectId}/offerings/${offering.id}/packages`,
  );
  const monthlyPackage = await ensurePackage(offering.id, existingPackages, "$rc_monthly", "Monthly");
  const annualPackage = await ensurePackage(offering.id, existingPackages, "$rc_annual", "Annual");

  for (const [pkg, desired] of [
    [monthlyPackage, monthly],
    [annualPackage, annual],
  ] as const) {
    const attached = await attachedProducts(pkg.id);
    const replaceIds = attached
      .filter((item) => item.app_id === testStoreAppId && item.id !== desired.id)
      .map((item) => item.id);
    if (replaceIds.length) {
      await request(`/projects/${projectId}/packages/${pkg.id}/actions/detach_products`, {
        method: "POST",
        body: JSON.stringify({ product_ids: replaceIds }),
      });
    }
    if (!attached.some((item) => item.id === desired.id)) {
      await request(`/projects/${projectId}/packages/${pkg.id}/actions/attach_products`, {
        method: "POST",
        body: JSON.stringify({
          products: [{ product_id: desired.id, eligibility_criteria: "all" }],
        }),
      });
    }
  }

  const replacedTestProducts = products.filter(
    (item) =>
      item.app_id === testStoreAppId &&
      item.type === "subscription" &&
      item.id !== monthly.id &&
      item.id !== annual.id,
  );
  if (replacedTestProducts.length) {
    await request(`/projects/${projectId}/entitlements/${entitlement.id}/actions/detach_products`, {
      method: "POST",
      body: JSON.stringify({ product_ids: replacedTestProducts.map((item) => item.id) }),
    });
    for (const product of replacedTestProducts) {
      try {
        await request(`/projects/${projectId}/products/${product.id}`, { method: "DELETE" });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("has transactions")) {
          throw error;
        }
        await request(`/projects/${projectId}/products/${product.id}/actions/archive`, {
          method: "POST",
        });
      }
    }
  }

  const [verifiedMonthly, verifiedAnnual] = await Promise.all([
    attachedProducts(monthlyPackage.id),
    attachedProducts(annualPackage.id),
  ]);
  if (
    !verifiedMonthly.some((item) => item.id === monthly.id) ||
    !verifiedAnnual.some((item) => item.id === annual.id)
  ) {
    throw new Error("RevenueCat package verification failed.");
  }
  console.log("RevenueCat current offering now has FixMate Plus monthly and annual Test Store packages.");
}

configure().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});