import { MEETINGS_TABLE } from "../tables";
import type { Meeting } from "../db-types";

// Meeting-related SQL queries
// All queries use parameterized SQL for safety

export const getMeetingById = (meetingId: string) => `
  SELECT * FROM ${MEETINGS_TABLE}
  WHERE id = $1
`;

export const getMeetingsByUser = (userId: string, limit = 20, offset = 0) => `
  SELECT * FROM ${MEETINGS_TABLE}
  WHERE user_id = $1
  ORDER BY start_time ASC
  LIMIT $2 OFFSET $3
`;

export const getAllMeetings = (limit = 20, offset = 0) => `
  SELECT * FROM ${MEETINGS_TABLE}
  ORDER BY start_time ASC
  LIMIT $1 OFFSET $2
`;

export const createMeeting = (
  meeting: Omit<Meeting, "id" | "created_at" | "updated_at">
) => `
  INSERT INTO ${MEETINGS_TABLE} (user_id, title, description, start_time, end_time)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING *
`;

export const updateMeeting = (
  meetingId: string,
  updates: Partial<
    Pick<Meeting, "title" | "description" | "start_time" | "end_time">
  >
) => `
  UPDATE ${MEETINGS_TABLE}
  SET 
    title = COALESCE($2, title),
    description = COALESCE($3, description),
    start_time = COALESCE($4, start_time),
    end_time = COALESCE($5, end_time),
    updated_at = NOW()
  WHERE id = $1
  RETURNING *
`;

export const deleteMeeting = (meetingId: string) => `
  DELETE FROM ${MEETINGS_TABLE}
  WHERE id = $1
`;

// Advanced queries
export const getMeetingsInDateRange = (
  startDate: string,
  endDate: string,
  userId?: string
) => {
  const baseQuery = `
    SELECT * FROM ${MEETINGS_TABLE}
    WHERE start_time >= $1 AND start_time <= $2
  `;

  if (userId) {
    return `${baseQuery} AND user_id = $3 ORDER BY start_time ASC`;
  }

  return `${baseQuery} ORDER BY start_time ASC`;
};

// Count queries
export const countMeetingsByUser = (userId: string) => `
  SELECT COUNT(*) as count FROM ${MEETINGS_TABLE}
  WHERE user_id = $1
`;

export const countAllMeetings = () => `
  SELECT COUNT(*) as count FROM ${MEETINGS_TABLE}
`;
