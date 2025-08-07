import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  auth: null,
};

export const authSlice = createSlice({
  name: "authStore",
  initialState,
  reducers: {
    Login: (state, action) => {
      state.auth = action.payload;
    },
    logout: (state) => {
      state.auth = null;
    },
  },
});

// Fix here: export actions from authSlice, not authreducer
export const { Login, logout } = authSlice.actions;

// Fix here: default export the slice reducer, not authreducer
export default authSlice.reducer;
