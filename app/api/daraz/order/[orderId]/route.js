// snippet inside /app/api/daraz/order/[orderId]/route.js after you build lineItems
import DarazProductMap from "@/models/DarazProductMap";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

const hydrated = [];
for (const li of lineItems) {
  const map = await DarazProductMap.findOne({ seller_sku: li.sku }).lean();

  if (!map) {
    hydrated.push({ ...li, unmapped: true });
    continue;
  }

  const productDoc = await Product.findById(map.product_id)
    .select("_id name slug warrantyMonths modelNumber")
    .lean();
  const variantDoc = map.variant_id
    ? await ProductVariant.findById(map.variant_id).select("_id variantName sku").lean()
    : null;

  hydrated.push({
    ...li,
    local_match: {
      product_id: productDoc?._id || map.product_id,
      variant_id: variantDoc?._id || map.variant_id || null,
    },
    warranty: {
      product_name: productDoc?.name || map.product_name,
      variant_label: variantDoc?.variantName || map.variant_name || null,
      model_number: productDoc?.modelNumber || null,
      warranty_months: productDoc?.warrantyMonths ?? 0,
    },
  });
}
