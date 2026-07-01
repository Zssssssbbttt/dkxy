import { clearUserInfo } from "@/contexts/UserContext";

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    clearUserInfo();
    window.location.href = "/login";
    throw new Error("未登录");
  }

  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "无权限");
  }

  return res;
}

export async function apiGet(url: string) {
  return request(url);
}

export async function apiPost(url: string, body: unknown) {
  return request(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut(url: string, body: unknown) {
  return request(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDelete(url: string) {
  return request(url, { method: "DELETE" });
}