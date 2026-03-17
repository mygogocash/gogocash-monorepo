import { DataSession } from "@/app/api/auth/[...nextauth]/route";
import axios, { AxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

// Internal-only: always use mock API.
const baseURL = "/api/mock";

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  async (config) => {
    const session = (await getSession()) as unknown as DataSession; // Get session
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // console.log('API response error:', error.response);
      //   throw new Error(error.response.data.message || 'API request failed');
      return Promise.reject(error.response);
      // throw new Error('No response from server');
    } else if (error.request) {
      throw new Error("No response from server");
    } else {
      throw new Error("An error occurred while setting up the request");
    }
  },
);

export default client;

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.get(url, { ...config });

  return res.data;
};

export const fetcherPost = async (
  args: string | [string, AxiosRequestConfig],
) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.post(url, { ...config });

  return res.data;
};

export const fetcherPut = async (
  args: string | [string, AxiosRequestConfig],
) => {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await client.put(url, { ...config });

  return res.data;
};
