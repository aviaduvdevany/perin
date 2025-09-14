import { UpdateUserData } from "@/types/database";
import internalApiRequest from "@/app/(main-app)/services/internalApi";
import { HTTPMethod } from "@/types/api";

export const updateUserProfileService = async (data: UpdateUserData) => {
  try {
    const response = await internalApiRequest(
      "users/profile",
      HTTPMethod.PUT,
      data
    );
    return response;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const getUserProfileService = async () => {
  try {
    const response = await internalApiRequest("users/profile", HTTPMethod.GET);
    return response;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};
