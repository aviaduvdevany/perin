import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const connectGmailService = async () => {
  try {
    const response = await internalApiRequest(
      "integrations/gmail/connect",
      HTTPMethod.POST
    );
    return response?.authUrl;
  } catch (error) {
    console.error("Error connecting Gmail:", error);
    throw error;
  }
};
