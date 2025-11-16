// src/api/adsets.js

import { API_BASE } from "../config/api";

const API_BASE_URL = API_BASE;

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchAdsets(datePreset) {
  const response = await fetch(`${API_BASE_URL}/api/adsets?date_preset=${datePreset}`);
  return handleResponse(response);
}

export async function fetchAdsetDetails(adsetId) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${encodeURIComponent(adsetId)}`);
  if (!response.ok) {
    // Many backends may not have this endpoint yet; degrade gracefully
    return null;
  }
  return response.json();
}

export async function fetchAdsetHistory(adsetId) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${encodeURIComponent(adsetId)}/history?limit=50`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function fetchAdsetAds(adsetId) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${encodeURIComponent(adsetId)}/ads`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}

export async function fetchAdsetTimeInsights(adsetId) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${encodeURIComponent(adsetId)}/time-insights`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}
export async function updateAdsetStatus(adsetId, newStatus) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${adsetId}/update-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  return handleResponse(response);
}

export async function fetchAiAnalysis(adsets) {
  const response = await fetch(`${API_BASE_URL}/api/analyze-adsets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adsets),
  });
  return handleResponse(response);
}

export async function updateAdsetBudgetDates(adsetId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/adsets/${encodeURIComponent(adsetId)}/update-budget-dates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}
