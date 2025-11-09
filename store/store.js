// store/store.js
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storageModule from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

// existing
import authreducer from "./reducer/AuthReducer";
import cartReducer from "./cartSlice";

// 1) App reducers
const appReducer = combineReducers({
  authStore: authreducer,
  cart: cartReducer,
});

// 2) Root reducer that clears state on logout
const rootReducer = (state, action) => {
  if (action.type === "authStore/logout" || action.type === "RESET_STORE") {
    state = undefined; // ← causes a full reset to initial state for all slices
  }
  return appReducer(state, action);
};

const resolvedStorage =
  storageModule?.default && typeof storageModule.default === "object"
    ? storageModule.default
    : storageModule;

const createNoopStorage = () => ({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
});

const storage = typeof window === "undefined" ? createNoopStorage() : resolvedStorage;

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
