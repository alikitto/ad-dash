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
  const response = await fetch(`${API_BASE_URL}/adsets?date_preset=${datePreset}`);
  return handleResponse(response);
}

export async function updateAdsetStatus(adsetId, newStatus) {
  const response = await fetch(`${API_BASE_URL}/adsets/${adsetId}/update-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });
  return handleResponse(response);
}

export async function fetchAiAnalysis(adsets) {
  const response = await fetch(`${API_BASE_URL}/analyze-adsets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adsets),
  });
  return handleResponse(response);
}
