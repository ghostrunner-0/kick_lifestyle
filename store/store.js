import { combineReducers, configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage"; // Correct import
import { persistReducer, persistStore } from "redux-persist"; // Proper way to import
import authreducer from "./reducer/AuthReducer";

// Example slice (add your slices here)
const rootReducer = combineReducers({
    authStore: authreducer, // Ensure this matches the name in your slice
  // yourSlice: yourSliceReducer
});

const persistConfig = {
  key: "root",
  storage, // should be lowercase
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
