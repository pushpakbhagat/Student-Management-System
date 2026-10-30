import axios from "axios";

// In development leave VITE_API_URL empty: requests go to /api and Vite proxies them to the backend.
// In production set VITE_API_URL to the deployed backend URL.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    withCredentials: true,
    timeout: 15000,
});

// Turns any axios error into a sentence we can show to the user
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
    if (error?.response?.data?.msg) return error.response.data.msg;
    if (error?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
    if (error?.request && !error.response) return "Can't reach the server. Check your connection.";
    return fallback;
}

// Called when any request comes back 401 (session expired or account removed).
// The session store registers the handler, which avoids a circular import.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

const AUTH_PROBES = ["/logininfo", "/me"];

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || "";
        if (error.response?.status === 401 && !AUTH_PROBES.includes(url)) {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default api;
