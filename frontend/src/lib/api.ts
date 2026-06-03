import axios from 'axios';
import { AssignmentFormData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Create assignment and start generation job
export async function createAssignment(formData: AssignmentFormData) {
  const data = new FormData();
  data.append('title', formData.title);
  data.append('subject', formData.subject);
  data.append('gradeLevel', formData.gradeLevel);
  data.append('dueDate', new Date(formData.dueDate).toISOString());
  data.append('questionTypes', JSON.stringify(formData.questionTypes));
  data.append('totalQuestions', String(formData.totalQuestions));
  data.append('totalMarks', String(formData.totalMarks));
  data.append('duration', formData.duration);
  if (formData.additionalInstructions) {
    data.append('additionalInstructions', formData.additionalInstructions);
  }
  if (formData.file) {
    data.append('file', formData.file);
  }

  const response = await apiClient.post('/api/assignments', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

// Get assignment details with generated paper
export async function getAssignment(id: string) {
  const response = await apiClient.get(`/api/assignments/${id}`);
  return response.data;
}

// Get all assignments
export async function getAssignments(page = 1, limit = 10) {
  const response = await apiClient.get(`/api/assignments?page=${page}&limit=${limit}`);
  return response.data;
}

// Poll job status
export async function getAssignmentStatus(id: string) {
  const response = await apiClient.get(`/api/assignments/${id}/status`);
  return response.data;
}

// Regenerate paper
export async function regenerateAssignment(id: string) {
  const response = await apiClient.post(`/api/assignments/${id}/regenerate`);
  return response.data;
}

// Get PDF download URL
export function getPDFUrl(
  assignmentId: string,
  studentName = '',
  rollNumber = '',
  section = ''
) {
  const params = new URLSearchParams();
  if (studentName) params.set('studentName', studentName);
  if (rollNumber) params.set('rollNumber', rollNumber);
  if (section) params.set('section', section);
  const query = params.toString();
  return `${API_URL}/api/pdf/${assignmentId}${query ? `?${query}` : ''}`;
}
