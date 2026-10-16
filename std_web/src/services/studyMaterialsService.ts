import { StudyDocType, StudyMaterialModel } from '../types';
import { apiClient } from './apiClient';

function parseType(
  t?: string,
  docType?: string,
  fileName?: string
): StudyDocType {
  const combined = `${t || ''} ${docType || ''} ${fileName || ''}`.toUpperCase();
  if (combined.includes('DOCX') || combined.includes('DOC') || combined.includes('WORD')) {
    return 'DOCX';
  }
  if (combined.includes('PPTX') || combined.includes('PPT') || combined.includes('PRESENTATION')) {
    return 'PPTX';
  }
  if (combined.includes('NOTES') || combined.includes('GUIDE')) {
    return 'GUIDE';
  }
  return 'PDF';
}

export const studyMaterialsService = {
  async getAllMaterials(): Promise<StudyMaterialModel[]> {
    try {
      const response = await apiClient.get('/api/v1/student/study-materials');
      const data = response.data?.data;
      if (Array.isArray(data)) {
        return data.map((json: {
          id?: string;
          title?: string;
          category?: string;
          description?: string;
          type?: string;
          readTimeMinutes?: number;
          content?: string;
          keyPoints?: string[];
          key_points?: string[];
          fileName?: string;
          fileSize?: number;
          kind?: string;
          documentType?: string;
          embedUrl?: string;
          createdAt?: string;
          created_at?: string;
          titleMr?: string;
          categoryMr?: string;
          descriptionMr?: string;
          contentMr?: string;
          titleHi?: string;
          categoryHi?: string;
          descriptionHi?: string;
          contentHi?: string;
        }) => {
          const keyPoints = Array.isArray(json.keyPoints)
            ? json.keyPoints
            : Array.isArray(json.key_points)
            ? json.key_points
            : [];

          return {
            id: String(json.id || ''),
            title: String(json.title || ''),
            category: String(json.category || 'General'),
            description: String(json.description || ''),
            type: parseType(json.type, json.documentType, json.fileName),
            readTimeMinutes: typeof json.readTimeMinutes === 'number' ? json.readTimeMinutes : 5,
            content: String(json.content || ''),
            keyPoints,
            fileName: json.fileName,
            fileSize: json.fileSize,
            kind: String(json.kind || 'DOCUMENT'),
            documentType: json.documentType,
            embedUrl: json.embedUrl,
            createdAt: json.createdAt || json.created_at,
            titleMr: json.titleMr,
            categoryMr: json.categoryMr,
            descriptionMr: json.descriptionMr,
            contentMr: json.contentMr,
            titleHi: json.titleHi,
            categoryHi: json.categoryHi,
            descriptionHi: json.descriptionHi,
            contentHi: json.contentHi,
          };
        });
      }
      return [];
    } catch {
      return [];
    }
  },

  async getMaterialAccess(id: string): Promise<{ url?: string; kind?: string } | null> {
    try {
      const response = await apiClient.get(`/api/v1/student/study-materials/${id}/access`);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },

  async downloadMaterial(id: string, defaultFileName: string = 'study_document.pdf'): Promise<void> {
    try {
      // Step 1: Check if signed access URL is provided
      const access = await this.getMaterialAccess(id);
      if (access?.url && (access.url.startsWith('http://') || access.url.startsWith('https://'))) {
        const link = document.createElement('a');
        link.href = access.url;
        link.download = defaultFileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Step 2: Download raw binary via authenticated download endpoint
      const response = await apiClient.get(`/api/v1/student/study-materials/${id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      throw new Error(`Download failed: ${e instanceof Error ? e.message : 'Network error'}`);
    }
  },
};
