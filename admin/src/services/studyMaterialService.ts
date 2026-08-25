import type { StudyMaterial } from '../types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockMaterials: StudyMaterial[] = [
  {
    id: 'm1',
    title: 'Unit 3 — Database Systems',
    description: 'Comprehensive notes covering relational databases, SQL fundamentals, and normalization.',
    fileName: 'database-systems-unit3.pdf',
    fileType: 'application/pdf',
    fileSize: 2457600,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'm2',
    title: 'Assignment 2 — Networking',
    description: 'Practice assignment on TCP/IP model and network layer protocols.',
    fileName: 'networking-assignment2.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 512000,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'm3',
    title: 'Introduction to Python — Lecture Slides',
    description: 'Presentation slides covering Python basics, data types, and control flow.',
    fileName: 'python-intro-slides.pptx',
    fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileSize: 5242880,
    status: 'DRAFT',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    publishedAt: null,
  },
];

export async function getStudyMaterials(): Promise<StudyMaterial[]> {
  await delay(300);
  return mockMaterials.map((m) => ({ ...m }));
}

export async function getStudyMaterialById(id: string): Promise<StudyMaterial | undefined> {
  await delay(200);
  const m = mockMaterials.find((m) => m.id === id);
  return m ? { ...m } : undefined;
}

export async function createStudyMaterial(data: Omit<StudyMaterial, 'id' | 'createdAt' | 'publishedAt'>): Promise<StudyMaterial> {
  await delay(400);
  const item: StudyMaterial = {
    ...data,
    id: 'm' + Date.now(),
    createdAt: new Date().toISOString(),
    publishedAt: null,
  };
  mockMaterials.push(item);
  return { ...item };
}

export async function updateStudyMaterial(id: string, data: Partial<Pick<StudyMaterial, 'title' | 'description' | 'status'>>): Promise<StudyMaterial> {
  await delay(300);
  const idx = mockMaterials.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Study material not found');
  const existing = mockMaterials[idx];
  if (data.title !== undefined) existing.title = data.title;
  if (data.description !== undefined) existing.description = data.description;
  if (data.status !== undefined) {
    existing.status = data.status;
    if (data.status === 'PUBLISHED' && !existing.publishedAt) {
      existing.publishedAt = new Date().toISOString();
    }
  }
  mockMaterials[idx] = existing;
  return { ...existing };
}

export async function publishStudyMaterial(id: string): Promise<StudyMaterial> {
  await delay(400);
  const idx = mockMaterials.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error('Study material not found');
  mockMaterials[idx].status = 'PUBLISHED';
  mockMaterials[idx].publishedAt = new Date().toISOString();
  return { ...mockMaterials[idx] };
}

export async function deleteStudyMaterial(id: string): Promise<void> {
  await delay(300);
  const idx = mockMaterials.findIndex((m) => m.id === id);
  if (idx !== -1) mockMaterials.splice(idx, 1);
}
