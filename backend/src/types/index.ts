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
  options?: string[]; // for MCQ
}

export interface Section {
  id: string;
  title: string; // e.g. "Section A"
  instruction: string; // e.g. "Attempt all questions"
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

export interface AssignmentInput {
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileContent?: string;
  duration?: string;
}

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';

export interface JobState {
  jobId: string;
  assignmentId: string;
  status: JobStatus;
  progress: number;
  message: string;
  result?: GeneratedPaper;
  error?: string;
}

export interface WsMessage {
  type: 'job_update' | 'job_complete' | 'job_error';
  payload: JobState;
}
