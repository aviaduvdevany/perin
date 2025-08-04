import { UpdateUserData } from "@/types/database";
import internalApiRequest from "./internalApi";
import { HTTPMethod } from "@/types/api";

export const updateUserProfileService = async (data: UpdateUserData) => {
  const response = await internalApiRequest("users/profile", HTTPMethod.PUT, data);
  return response;
};
