import { HTTPMethod } from "@/types/api";

const internalApiRequest = async (
  path: string,
  method: HTTPMethod,
  body?: unknown
) => {
  // Use relative URL if NEXT_PUBLIC_API_URL is not set (for same-origin requests)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL || "";
  const url = `${baseUrl}/api/${path}`;
  const options = {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await fetch(url, options);

    // Check if response is ok (status 200-299)
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    // Check if response has JSON content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("API Error: Response is not JSON", contentType);
      throw new Error("API response is not JSON");
    }

    return await response.json();
  } catch (error) {
    console.error("Error in internalApiRequest:", error);
    throw error; // Re-throw to let calling code handle it
  }
};

export default internalApiRequest;
