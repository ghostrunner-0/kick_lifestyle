// store/cartSlice.js
import {
  createSlice,
  createSelector,
  createAsyncThunk,
} from "@reduxjs/toolkit";

/** Public website endpoints */
const PRODUCT_URL = (id) => `/api/website/product/${id}`;
const VARIANT_URL = (id) => `/api/website/product-variant/${id}`;

/** stable key */
const lineKey = ({ productId, variant }) => `${productId}|${variant?.id || ""}`;

/** ensure state shape (handles old persisted carts) */
const ensureShape = (state) => {
  if (!state.items) state.items = {};
  if (!state.meta) state.meta = { repricing: false };
};

/** ---- REPRICE THUNK ---- */
export const repriceCart = createAsyncThunk(
  "cart/repriceCart",
  async (_, { getState }) => {
    const itemsMap = getState()?.cart?.items || {};
    const lines = Object.values(itemsMap);

    const jobs = lines.map(async (line) => {
      const key = lineKey(line);
      try {
        if (line.variant?.id) {
          // Variant pricing
          const url = `${VARIANT_URL(line.variant.id)}?ts=${Date.now()}`;
          const res = await fetch(url, { cache: "no-store" });
          const json = await res.json();
          if (!json?.success) throw new Error("Variant fetch failed");
          const d = json.data;

          const priceNow =
            d.specialPrice !== undefined && d.specialPrice !== null
              ? Number(d.specialPrice)
              : Number(d.mrp);

          const imageGuess =
            d?.productGallery?.[0]?.path ||
            d?.swatchImage?.path ||
            line.image ||
            "";

          return {
            key,
            priceNow,
            latestMrp: Number(d.mrp),
            stockAvail: Number(d.stock ?? 0),
            newName: d?.product?.name, // product name might change
            newVariantName: d?.variantName,
            imageGuess,
          };
        } else {
          // Product pricing
          const url = `${PRODUCT_URL(line.productId)}?ts=${Date.now()}`;
          const res = await fetch(url, { cache: "no-store" });
          const json = await res.json();
          if (!json?.success) throw new Error("Product fetch failed");
          const d = json.data;

          const priceNow =
            d.specialPrice !== undefined && d.specialPrice !== null
              ? Number(d.specialPrice)
              : Number(d.mrp);

          const imageGuess =
            d?.heroImage?.path ||
            d?.productMedia?.[0]?.path ||
            line.image ||
            "";

          return {
            key,
            priceNow,
            latestMrp: Number(d.mrp),
            stockAvail: Number(d.stock ?? 0),
            newName: d?.name,
            imageGuess,
          };
        }
      } catch (e) {
        // keep the line as-is on error
        return { key, error: true };
      }
    });

    return Promise.all(jobs);
  }
);

/** initial state */
const initialState = {
  items: {},
  coupon: null,
  meta: { repricing: false },
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, { payload }) {
      ensureShape(state);
      const key = lineKey(payload);
      const existing = state.items[key];
      const qty = Math.max(1, Number(payload.qty || 1));

      state.items[key] = existing
        ? { ...existing, qty: existing.qty + qty }
        : {
            productId: payload.productId,
            slug: payload.slug,
            name: payload.name,
            qty,
            price: Number(payload.price),
            mrp: Number(payload.mrp ?? payload.price),
            image: payload.image || undefined,
            variant: payload.variant
              ? {
                  id: payload.variant.id,
                  sku: payload.variant.sku,
                  name: payload.variant.name,
                  image: payload.variant.image || undefined,
                }
              : null,
            flags: {},
            isFreeItem: !!payload.isFreeItem,
          };
    },
    setQty(state, { payload }) {
      ensureShape(state);
      const key = lineKey(payload);
      const line = state.items[key];
      if (!line) return;
      const next = Math.max(0, Number(payload.qty || 0));
      if (next === 0) delete state.items[key];
      else line.qty = next;
    },
    removeItem(state, { payload }) {
      ensureShape(state);
      const key = lineKey(payload);
      delete state.items[key];
    },
    clearCart(state) {
      ensureShape(state);
      state.items = {};
      state.coupon = null;
    },
    setCoupon(state, { payload }) {
      ensureShape(state);
      state.coupon = payload ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(repriceCart.pending, (state) => {
        ensureShape(state);
        state.meta.repricing = true;
      })
      .addCase(repriceCart.fulfilled, (state, { payload }) => {
        ensureShape(state);
        state.meta.repricing = false;
        if (!Array.isArray(payload)) return;

        const toDelete = [];
        for (const r of payload) {
          if (!r || !r.key) continue;
          const line = state.items[r.key];
          if (!line) continue;
          if (r.error) continue;
          if (line.isFreeItem) continue; // skip price update for free item

          const priceChanged =
            Number(line.price) !== Number(r.priceNow) ||
            Number(line.mrp) !== Number(r.latestMrp);

          line.price = Number(r.priceNow);
          line.mrp = Number(r.latestMrp);

          if (r.newName) line.name = r.newName;
          if (r.newVariantName && line.variant)
            line.variant.name = r.newVariantName;
          if (r.imageGuess) {
            line.image = r.imageGuess;
            if (line.variant && !line.variant.image)
              line.variant.image = r.imageGuess;
          }

          line.flags = {
            ...(line.flags || {}),
            priceChanged,
            capped: false,
            outOfStock: false,
          };

          const avail = Math.max(0, Number(r.stockAvail || 0));
          if (avail === 0) {
            line.flags.outOfStock = true;
            toDelete.push(r.key); // remove OOS lines
          } else if (line.qty > avail) {
            line.qty = avail;
            line.flags.capped = true;
          }
        }
        for (const k of toDelete) delete state.items[k];
      })
      .addCase(repriceCart.rejected, (state) => {
        ensureShape(state);
        state.meta.repricing = false;
      });
  },
});

export const { addItem, setQty, removeItem, clearCart, setCoupon } =
  cartSlice.actions;
export default cartSlice.reducer;

/* selectors */
const selectCartState = (s) =>
  s?.cart ?? { items: {}, meta: { repricing: false } };
export const selectItemsMap = createSelector(
  [selectCartState],
  (c) => c.items ?? {}
);
export const selectItems = createSelector([selectItemsMap], (m) =>
  Object.values(m)
);

/** qty-based count (kept if you still need it elsewhere) */
export const selectCartCount = createSelector([selectItems], (items) =>
  items.reduce((n, it) => n + (it.qty || 0), 0)
);

/** ✅ NEW: distinct products count (lines) */
export const selectUniqueCount = createSelector(
  [selectItems],
  (items) => items.length
);

/** totals */
export const selectSubtotal = createSelector([selectItems], (items) =>
  items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
    0
  )
);
export const selectRepricing = createSelector(
  [selectCartState],
  (c) => !!c.meta?.repricing
);
