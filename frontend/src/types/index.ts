export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType =
  | 'multiple-choice'
  | 'short-answer'
  | 'long-answer'
  | 'true-false'
  | 'fill-in-the-blank';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options?: string[];
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
  totalMarks: number;
}

export interface GeneratedPaper {
  title: string;
  subject: string;
  duration: string;
  totalMarks: number;
  sections: Section[];
  generatedAt: string;
}

export interface AssignmentFormData {
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: string;
  questionTypes: QuestionType[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions: string;
  duration: string;
  file: File | null;
}

export type JobStatus = 'idle' | 'waiting' | 'active' | 'completed' | 'failed';

export interface JobState {
  jobId: string;
  assignmentId: string;
  status: JobStatus;
  progress: number;
  message: string;
  result?: GeneratedPaper;
  error?: string;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: string;
  status: JobStatus;
  totalQuestions: number;
  totalMarks: number;
  createdAt: string;
}
