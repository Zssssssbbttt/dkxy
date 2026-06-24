export async function apiClient(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  return res;
}

export async function apiGet(url: string) {
  return apiClient(url);
}

export async function apiPost(url: string, body: unknown) {
  return apiClient(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut(url: string, body: unknown) {
  return apiClient(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(url: string) {
  return apiClient(url, { method: "DELETE" });
}