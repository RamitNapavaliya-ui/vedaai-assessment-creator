import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AssignmentFormData, JobState, GeneratedPaper, QuestionType, Assignment } from '@/types';

interface AssignmentStore {
  // Form state
  form: AssignmentFormData;
  setFormField: <K extends keyof AssignmentFormData>(key: K, value: AssignmentFormData[K]) => void;
  resetForm: () => void;

  // Job tracking
  currentJob: JobState | null;
  setJobState: (state: JobState) => void;
  clearJob: () => void;

  // Generated paper
  generatedPaper: GeneratedPaper | null;
  setGeneratedPaper: (paper: GeneratedPaper) => void;

  // Current assignment ID
  currentAssignmentId: string | null;
  setCurrentAssignmentId: (id: string) => void;

  // Assignments list
  assignments: Assignment[];
  setAssignments: (assignments: Assignment[]) => void;

  // Student info for PDF
  studentInfo: { name: string; rollNumber: string; section: string };
  setStudentInfo: (info: { name: string; rollNumber: string; section: string }) => void;
}

const defaultForm: AssignmentFormData = {
  title: '',
  subject: '',
  gradeLevel: '',
  dueDate: '',
  questionTypes: [],
  totalQuestions: 10,
  totalMarks: 100,
  additionalInstructions: '',
  duration: '3 hours',
  file: null,
};

export const useAssignmentStore = create<AssignmentStore>()(
  devtools(
    persist(
      (set) => ({
        form: defaultForm,
        setFormField: (key, value) =>
          set((state) => ({ form: { ...state.form, [key]: value } })),
        resetForm: () => set({ form: defaultForm }),

        currentJob: null,
        setJobState: (jobState) => set({ currentJob: jobState }),
        clearJob: () => set({ currentJob: null }),

        generatedPaper: null,
        setGeneratedPaper: (paper) => set({ generatedPaper: paper }),

        currentAssignmentId: null,
        setCurrentAssignmentId: (id) => set({ currentAssignmentId: id }),

        assignments: [],
        setAssignments: (assignments) => set({ assignments }),

        studentInfo: { name: '', rollNumber: '', section: '' },
        setStudentInfo: (info) => set({ studentInfo: info }),
      }),
      {
        name: 'vedaai-store',
        partialize: (state) => ({
          assignments: state.assignments,
          studentInfo: state.studentInfo,
        }),
      }
    )
  )
);
