'use client';

import { fetchAuthSession } from 'aws-amplify/auth';
import { isCognitoConfigured } from './amplify';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'katara-token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function authHeaders() {
  if (isCognitoConfigured()) {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `API_${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = await authHeaders();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
        ...(options.headers || {})
      }
    });
  } catch {
    throw new ApiError(0, { error: 'API_UNREACHABLE' });
  }

  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

const get = (path) => apiFetch(path);
const send = (method) => (path, payload) =>
  apiFetch(path, { method, body: payload === undefined ? undefined : JSON.stringify(payload) });

const post = send('POST');
const patch = send('PATCH');

export async function login({ email, password }) {
  const result = await post('/auth/login', { email, password });
  setToken(result.token);
  return result.user;
}

export const fetchMe = () => get('/auth/me');

export const fetchPharmacies = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const qs = search.toString();
  return get(`/pharmacies${qs ? `?${qs}` : ''}`);
};

export const fetchPharmacy = (id) => get(`/pharmacies/${id}`);
export const fetchMedications = () => get('/medications');
export const createReservation = (payload) => post('/reservations', payload);
export const fetchMyReservations = () => get('/me/reservations');
export const fetchMyProfile = () => get('/me/profile');
export const updateMyProfile = (payload) => patch('/me/profile', payload);
export const fetchPrescriptions = () => get('/prescriptions');
export const askSubstituteModel = (payload) => post('/ai/substitutes', payload);

export async function uploadPrescription(file, metadata = {}) {
  const signed = await post('/prescriptions/upload-url', { fileName: file.name, contentType: file.type });

  const upload = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream', ...(await authHeaders()) },
    body: file
  });
  if (!upload.ok) throw new ApiError(upload.status, { error: 'UPLOAD_FAILED' });

  return post('/prescriptions', {
    objectKey: signed.objectKey,
    fileName: file.name,
    contentType: file.type,
    ...metadata
  });
}

export const fetchInventory = () => get('/pharmacy/inventory');
export const addInventoryItem = (payload) => post('/pharmacy/inventory', payload);
export const updateInventoryItem = (id, payload) => patch(`/pharmacy/inventory/${id}`, payload);
export const fetchPharmacyReservations = () => get('/pharmacy/reservations');
export const setReservationStatus = (reference, status, note) =>
  patch(`/pharmacy/reservations/${reference}/status`, { status, note });
export const fetchCustomerHistory = (reference) => get(`/pharmacy/customer-history/${reference}`);
export const fetchForecasts = () => get('/pharmacy/forecasts');
export const fetchPharmacyProfile = () => get('/pharmacy/profile');
export const updatePharmacyProfile = (payload) => patch('/pharmacy/profile', payload);

export const fetchAdminDashboard = () => get('/admin/dashboard');
export const fetchAdminPharmacies = (params = {}) => {
  const search = new URLSearchParams(
    Object.entries(typeof params === 'string' ? { search: params } : params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const qs = search.toString();
  return get(`/admin/pharmacies${qs ? `?${qs}` : ''}`);
};
export const fetchVerifications = () => get('/admin/verifications');
export const approveVerification = (id, notes) => post(`/admin/verifications/${id}/approve`, { notes });
export const rejectVerification = (id, notes) => post(`/admin/verifications/${id}/reject`, { notes });

export const globalSearch = (q) => get(`/search?q=${encodeURIComponent(q)}`);

const lbp = new Intl.NumberFormat('en-LB', { maximumFractionDigits: 0 });

export function formatLbp(value) {
  if (value === null || value === undefined) return '—';
  return `LBP ${lbp.format(Number(value))}`;
}
