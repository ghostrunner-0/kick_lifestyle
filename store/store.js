// store/index.js
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

// existing
import authreducer from "./reducer/AuthReducer";

// NEW
import cartReducer from "./cartSlice";

const rootReducer = combineReducers({
  authStore: authreducer,
  cart: cartReducer, // <-- add cart under the 'cart' key
});

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
