import { HTTPMethod } from "@/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalApiRequest = async (path: string, method: HTTPMethod, body?: any) => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/${path}`;
  const options = {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);
  return response.json();
};

export default internalApiRequest;