import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  ErrorResponses,
  validateRequiredFields,
} from "../../../../lib/utils/error-handlers";
import {
  createUserWithPassword,
  isValidEmail,
  validatePassword,
} from "../../../../lib/utils/auth-helpers";

// POST /api/auth/register - Register a new user
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate required fields
  const validation = validateRequiredFields(body, [
    "email",
    "password",
    "name",
  ]);
  if (!validation.isValid) {
    return ErrorResponses.badRequest(
      `Missing required fields: ${validation.missingFields.join(", ")}`
    );
  }

  const { email, password, name, ...otherFields } = body;

  // Validate email format
  if (!isValidEmail(email)) {
    return ErrorResponses.badRequest("Invalid email format");
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return ErrorResponses.badRequest(
      `Password validation failed: ${passwordValidation.errors.join(", ")}`
    );
  }

  // Create user
  const result = await createUserWithPassword({
    email,
    password,
    name,
    ...otherFields,
  });

  if (!result.success) {
    return ErrorResponses.badRequest(result.error || "Failed to create user");
  }

  return NextResponse.json(
    {
      message: "User registered successfully",
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
      },
    },
    { status: 201 }
  );
});
