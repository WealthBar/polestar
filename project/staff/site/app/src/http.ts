import axios from 'axios';

/* we shouldn't be testing axios in unit tests */

/* istanbul: ignore next */
export const http = axios.create({
  baseURL: process.env.API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* we should test our error handler thought */
export function handleError(window: { location: { reload(): void } }, console: { error(...msgs: any[]): void }) {
  return function execute(error: any) {
    console.error(error);
    if (error?.response?.status === 401) {
      window.location.reload();
    }
    return Promise.reject(error);
  };
}

/* istanbul: ignore next */
http.interceptors.response.use(
  undefined,
  handleError(window, console),
);
