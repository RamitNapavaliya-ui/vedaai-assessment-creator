import mongoose, { Document, Schema } from 'mongoose';
import { AssignmentInput, GeneratedPaper, JobStatus } from '../types';

export interface IAssignment extends Document {
  title: string;
  subject: string;
  gradeLevel: string;
  dueDate: Date;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileContent?: string;
  duration?: string;
  status: JobStatus;
  jobId?: string;
  generatedPaper?: GeneratedPaper;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  id: String,
  text: String,
  type: String,
  difficulty: String,
  marks: Number,
  options: [String],
});

const SectionSchema = new Schema({
  id: String,
  title: String,
  instruction: String,
  questions: [QuestionSchema],
  totalMarks: Number,
});

const GeneratedPaperSchema = new Schema({
  title: String,
  subject: String,
  duration: String,
  totalMarks: Number,
  sections: [SectionSchema],
  generatedAt: String,
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    gradeLevel: { type: String, required: true },
    dueDate: { type: Date, required: true },
    questionTypes: [{ type: String }],
    totalQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 1 },
    additionalInstructions: String,
    uploadedFileContent: String,
    duration: String,
    status: {
      type: String,
      enum: ['waiting', 'active', 'completed', 'failed'],
      default: 'waiting',
    },
    jobId: String,
    generatedPaper: GeneratedPaperSchema,
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
