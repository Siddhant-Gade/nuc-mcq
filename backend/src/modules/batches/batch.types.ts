export const batchStatuses = ['ACTIVE', 'FULL', 'INACTIVE'] as const;
export type BatchStatus = (typeof batchStatuses)[number];

export type CreateBatchInput = {
  batchId: string;
  batchName: string;
  instituteId: string;
  capacity: number;
};

export type StoredBatchRecord = {
  batchId: string;
  batchName: string;
  instituteId: string;
  capacity: number;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type BatchWithEnrollment = StoredBatchRecord & { enrolledCount: number };

export type BatchResponseRecord = {
  batchId: string;
  batchName: string;
  instituteId: string;
  capacity: number;
  enrolledCount: number;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
};
