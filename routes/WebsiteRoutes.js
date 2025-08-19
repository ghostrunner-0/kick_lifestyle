export const WEBSITE_HOME='/'
export const WEBSITE_LOGIN='/auth/login'
export const WEBSITE_REGISTER='/auth/register'
export const WEBSITE_FORGOT_PASSWORD='/auth/reset-password'
export const USER_DASHABOARD='/my-account'
export const CATEGORY_VIEW_ROUTE = (slug) =>
  slug ? `/category/${slug}` : "";
export const PRODUCT_VIEW_ROUTE = (slug) =>
  slug ? `/product/${slug}` : "";
export const ORDERS_THANK_YOU_ROUTE = (order_id) =>
  order_id ? `/orders/${order_id}` : "";