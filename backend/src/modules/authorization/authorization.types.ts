export const authorizationRequestStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type AuthorizationRequestStatus = (typeof authorizationRequestStatuses)[number];

/** Raw authorization_request row as stored. */
export type AuthorizationRequestRecord = {
  id: string;
  studentProfileId: string;
  authUserId: string | null;
  requestedAt: Date;
  status: AuthorizationRequestStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
};

/**
 * API shape matching the admin UI's AuthorizationRequest type:
 * studentName/studentId/prn are joined from student_profile.
 * The UI treats studentId and prn as the same PRN value (see mock data).
 */
export type AuthorizationRequestView = {
  id: string;
  studentProfileId: string;
  studentName: string;
  studentId: string;
  prn: string;
  authUserId: string | null;
  requestedAt: Date;
  status: AuthorizationRequestStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
};

export type ReviewOutcome = {
  request: AuthorizationRequestRecord;
  accessUpdated: boolean;
};
