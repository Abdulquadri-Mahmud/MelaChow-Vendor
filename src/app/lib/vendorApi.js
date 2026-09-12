import axios from "axios";
import { TokenManager } from "./auth-token";

const BASE_URL = "/api";

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ✅ Important: Send cookies with every request
});

const koboToNaira = (value) => Number(value || 0) / 100;

const normalizeOrderOptionMoney = (option = {}) => ({
  ...option,
  ...(option.price_modifier_naira !== undefined && {
    price_modifier_naira: koboToNaira(option.price_modifier_naira),
  }),
  ...(option.priceModifier !== undefined && {
    priceModifier: koboToNaira(option.priceModifier),
  }),
});

const normalizeOrderItemMoney = (item = {}) => {
  const pricing = item.metadata?.pricing;
  const selectedOptions = (item.selected_options || []).map(normalizeOrderOptionMoney);
  return {
    ...item,
    ...(item.price !== undefined && { price: koboToNaira(item.price) }),
    ...(item.originalPrice !== undefined && { originalPrice: koboToNaira(item.originalPrice) }),
    ...(item.vendorEarning !== undefined && { vendorEarning: koboToNaira(item.vendorEarning) }),
    ...(item.variant && {
      variant: {
        ...item.variant,
        ...(item.variant.price !== undefined && { price: koboToNaira(item.variant.price) }),
      },
    }),
    selected_options: selectedOptions,
    ...(item.metadata && {
      metadata: {
        ...item.metadata,
        selected_options: (item.metadata.selected_options || []).map(normalizeOrderOptionMoney),
        ...(pricing && {
          pricing: {
            ...pricing,
            ...(pricing.base_kobo !== undefined && { base_naira: koboToNaira(pricing.base_kobo) }),
            ...(pricing.final_unit_kobo !== undefined && { final_unit_naira: koboToNaira(pricing.final_unit_kobo) }),
            ...(pricing.options_total_kobo !== undefined && { options_total_naira: koboToNaira(pricing.options_total_kobo) }),
          },
        }),
      },
    }),
  };
};

const normalizeUserOrderMoney = (order) => {
  if (!order || order.moneyUnit !== 'kobo') return order;
  return {
    ...order,
    subtotal: koboToNaira(order.subtotal),
    deliveryFee: koboToNaira(order.deliveryFee),
    serviceFee: koboToNaira(order.serviceFee),
    total: koboToNaira(order.total),
    items: (order.items || []).map(normalizeOrderItemMoney),
    vendorDeliveryFees: (order.vendorDeliveryFees || []).map((fee) => ({
      ...fee,
      deliveryFee: koboToNaira(fee.deliveryFee),
    })),
    moneyUnit: 'naira',
  };
};

export const normalizeVendorOrderMoney = (order) => {
  if (!order || order.moneyUnit !== 'kobo') return order;
  return {
    ...order,
    commission: koboToNaira(order.commission),
    vendorTotal: koboToNaira(order.vendorTotal),
    deliveryShare: koboToNaira(order.deliveryShare),
    escrowAmount: koboToNaira(order.escrowAmount),
    items: (order.items || []).map(normalizeOrderItemMoney),
    userOrderId: normalizeUserOrderMoney(order.userOrderId),
    moneyUnit: 'naira',
  };
};

export const normalizeVendorProfileMoney = (vendor) => {
  if (!vendor) return vendor;
  const vendorOrders = (vendor.vendorOrders || []).map(normalizeVendorOrderMoney);
  const profileIsKobo = vendor.moneyUnit === 'kobo';

  return {
    ...vendor,
    // PostgreSQL stores this aggregate in total_sales_kobo. Prefer deriving
    // dashboard sales from normalized vendor orders, but keep profile totals
    // correct anywhere the aggregate is displayed directly.
    ...(vendor.totalSales !== undefined && {
      totalSales: profileIsKobo ? koboToNaira(vendor.totalSales) : Number(vendor.totalSales || 0),
    }),
    ...(vendor.flatRateDeliveryFee !== undefined && {
      flatRateDeliveryFee: profileIsKobo ? koboToNaira(vendor.flatRateDeliveryFee) : Number(vendor.flatRateDeliveryFee || 0),
    }),
    vendorOrders,
    moneyUnit: 'naira',
  };
};

// Add request interceptor to attach vendor token
API.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken('vendor');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let vendorRefreshPromise = null;

export const refreshVendorAccessToken = async () => {
  vendorRefreshPromise ||= axios.post('/api/vendor/auth/refresh', {}, { withCredentials: true }).then((response) => {
    const accessToken = response.data?.accessToken;
    if (!accessToken) throw new Error('Vendor refresh response did not include an access token');
    TokenManager.setToken(accessToken, 'vendor');
    return accessToken;
  }).finally(() => { vendorRefreshPromise = null; });
  return vendorRefreshPromise;
};

// Refresh an expired access token once, then replay the original request.
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isRefresh = request?.url?.includes('/vendors/auth/refresh');
    if (error.response?.status !== 401 || !request || request._vendorAuthRetried || isRefresh) return Promise.reject(error);
    request._vendorAuthRetried = true;
    try {
      const accessToken = await refreshVendorAccessToken();
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${accessToken}`;
      return API(request);
    } catch (refreshError) {
      if (!request.metadata?.suppressUnauthorized && typeof window !== 'undefined') window.dispatchEvent(new Event('vendor:unauthorized'));
      return Promise.reject(refreshError);
    }
  }
);

export const getVendorDetails = async () => {
  try {
    const response = await API.get(`/vendors/get-vendor`, {
      metadata: { suppressUnauthorized: true },
    });
    
    const payload = response.data;
    if (payload?.data) return { ...payload, data: normalizeVendorProfileMoney(payload.data) };
    if (payload?.vendor) return { ...payload, vendor: normalizeVendorProfileMoney(payload.vendor) };
    return normalizeVendorProfileMoney(payload);
  } catch (error) {
    if (error.response && error.response.status === 401) return null;
    throw error;
  }
};

export const getVendorWallet = async () => {
    const response = await API.get(`/vendors/get-wallet`);
    return response.data;
};

export const setVendorLiveStatus = async (isLive) => {
  const response = await API.patch('/vendors/live-status', { isLive });
  return response.data;
};

// --- PAYOUT & BANK MANAGEMENT ---
export const getBankList = async () => {
    const response = await API.get('/wallet/banks');
    return response.data;
};

export const resolveBankAccount = async (account_number, bank_code) => {
    const response = await API.get(`/wallet/resolve-account?account_number=${account_number}&bank_code=${bank_code}`);
    return response.data;
};

export const saveVendorBankAccount = async (data) => {
    const response = await API.post('/wallet/bank-account', data);
    return response.data;
};

export const removeVendorBankAccount = async () => {
    const response = await API.delete('/wallet/bank-account');
    return response.data;
};

export const initiateWithdrawal = async (amount) => {
    const response = await API.post('/wallet/withdraw', { amount });
    return response.data;
};

export const getVendorPayoutDetails = async () => {
    const response = await API.get('/vendors/payout-details');
    return response.data; // Returns { success: true, payoutDetails: {...} | null }
};

export const getWithdrawalHistory = async () => {
    const response = await API.get('/wallet/withdrawals');
    return response.data;
};

export const getVendorOrders = async () => {
  const response = await API.get(`/vendors/orders`);
  const payload = response.data;
  if (Array.isArray(payload?.data)) {
    return { ...payload, data: payload.data.map(normalizeVendorOrderMoney) };
  }
  return payload;
};

export const getVendorOrderById = async (orderId) => {
  const response = await API.get(`/vendors/orders/${orderId}`);
  const payload = response.data;
  if (payload?.data && !Array.isArray(payload.data)) {
    return { ...payload, data: normalizeVendorOrderMoney(payload.data) };
  }
  return payload?.moneyUnit === 'kobo' ? normalizeVendorOrderMoney(payload) : payload;
};

export const updateOrderStatus = async (vendorOrderId, status) => {
  // ✅ Validate vendorOrderId format (MongoDB ObjectId = 24 hex characters)
  if (!vendorOrderId || typeof vendorOrderId !== 'string') {
    console.error('❌ Invalid vendorOrderId format:', vendorOrderId);
    throw new Error('Invalid order ID format. Please refresh the page and try again.');
  }

  try {
    const response = await API.patch(`/vendors/orders/${vendorOrderId}/update`, { 
      status,
      notify: false // 🔕 Suppress push notification to user
    });
    return response.data;
  } catch (error) {
    console.error(`❌ API: Status update failed`, {
      vendorOrderId,
      status,
      error: error.response?.data || error.message
    });
    throw error;
  }
};

export const completeOrder = async (vendorOrderId) => {
  // ✅ Validate vendorOrderId format
  if (!vendorOrderId || typeof vendorOrderId !== 'string') {
    console.error('❌ Invalid vendorOrderId format for completion:', vendorOrderId);
    throw new Error('Invalid order ID format.');
  }

  try {
    const response = await API.patch(`/vendors/orders/${vendorOrderId}/complete`, {
      notify: false // 🔕 Suppress push notification to user
    });
    return response.data;
  } catch (error) {
    console.error(`❌ API: Order completion failed`, {
      vendorOrderId,
      error: error.response?.data || error.message
    });
    throw error;
  }
};

export const getVendorReviews = async () => {
  const response = await API.get('/vendors/reviews');
  return response.data;
};

// Rider Management
export const getVendorRiders = async (vendorId) => {
  const response = await API.get(`/vendors/${vendorId}/riders`);
  // console.log(response);
  return response.data;
};

export const createVendorRider = async (vendorId, riderData) => {
  const response = await API.post(`/vendors/${vendorId}/riders`, riderData);
  return response.data;
};

export const getAvailableRiders = async (vendorId) => {
  const response = await API.get(`/vendors/${vendorId}/riders/available`);
  return response.data;
};

export const assignRiderToOrder = async (vendorId, orderId, riderId) => {
  const response = await API.post(`/vendors/${vendorId}/orders/${orderId}/assign-rider`, { 
    riderId,
    notify: false // 🔕 Suppress push notification to user
  });
  return response.data;
};

export const updateVendorRider = async (vendorId, riderId, riderData) => {
  const response = await API.patch(`/vendors/${vendorId}/riders/${riderId}`, riderData);
  return response.data;
};

export const deactivateVendorRider = async (vendorId, riderId) => {
  const response = await API.delete(`/vendors/${vendorId}/riders/${riderId}`);
  return response.data;
};

// ── Disputed Delivery — Vendor Remake Response ─────────────────────────────────
/**
 * Respond YES or NO to a "Can you remake this order?" notification.
 *
 * POST /vendors/orders/:vendorOrderId/remake-response
 * Body: { decision: 'yes' | 'no' }
 *
 * @param {string} vendorOrderId - MongoDB _id of the VendorOrder (from notification.orderDatabaseId)
 * @param {'yes'|'no'} decision
 */
export const respondToRemakeRequest = async (vendorOrderId, decision) => {
  const response = await API.post(`/vendors/orders/${vendorOrderId}/remake-response`, { decision });
  return response.data;
};

export default API;
