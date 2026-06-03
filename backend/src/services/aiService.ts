import OpenAI from 'openai';
import { AssignmentInput, GeneratedPaper, Section, Question, QuestionType, Difficulty } from '../types';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPrompt(input: AssignmentInput): string {
  const questionTypesFormatted = input.questionTypes.join(', ');

  return `You are an expert educator creating a structured exam paper.

Assignment Details:
- Title: ${input.title}
- Subject: ${input.subject}  
- Grade Level: ${input.gradeLevel}
- Total Questions: ${input.totalQuestions}
- Total Marks: ${input.totalMarks}
- Question Types: ${questionTypesFormatted}
- Duration: ${input.duration || '2 hours'}
${input.additionalInstructions ? `- Special Instructions: ${input.additionalInstructions}` : ''}
${input.uploadedFileContent ? `\nReference Material:\n${input.uploadedFileContent.slice(0, 2000)}` : ''}

Create a structured question paper divided into sections (Section A, B, C based on question types or difficulty).

Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "subject": "string",
  "duration": "string",
  "totalMarks": number,
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "text": "Question text here",
          "type": "multiple-choice|short-answer|long-answer|true-false|fill-in-the-blank",
          "difficulty": "easy|medium|hard",
          "marks": number,
          "options": ["A) option1", "B) option2", "C) option3", "D) option4"]
        }
      ]
    }
  ]
}

Rules:
- Distribute ${input.totalQuestions} questions across sections logically
- Total marks of all questions must equal ${input.totalMarks}
- Include options array ONLY for multiple-choice questions
- Vary difficulty: mix of easy (30%), medium (50%), hard (20%)
- Questions must be academically appropriate for ${input.gradeLevel}
- Each section should have a clear instruction line
- Return ONLY the JSON object, no markdown, no explanation`;
}

function parseLLMResponse(raw: string): GeneratedPaper {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No valid JSON found in LLM response');
    parsed = JSON.parse(match[0]);
  }

  // Validate and normalize
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid response: missing sections');
  }

  const sections: Section[] = parsed.sections.map((s: any, sIdx: number) => {
    const questions: Question[] = (s.questions || []).map((q: any, qIdx: number) => ({
      id: uuidv4(),
      text: String(q.text || ''),
      type: validateQuestionType(q.type),
      difficulty: validateDifficulty(q.difficulty),
      marks: Number(q.marks) || 1,
      options: Array.isArray(q.options) ? q.options : undefined,
    }));

    return {
      id: uuidv4(),
      title: String(s.title || `Section ${String.fromCharCode(65 + sIdx)}`),
      instruction: String(s.instruction || 'Attempt all questions'),
      questions,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    };
  });

  return {
    title: String(parsed.title || 'Assessment Paper'),
    subject: String(parsed.subject || ''),
    duration: String(parsed.duration || '2 hours'),
    totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    sections,
    generatedAt: new Date().toISOString(),
  };
}

function validateQuestionType(type: string): QuestionType {
  const valid: QuestionType[] = [
    'multiple-choice',
    'short-answer',
    'long-answer',
    'true-false',
    'fill-in-the-blank',
  ];
  return valid.includes(type as QuestionType) ? (type as QuestionType) : 'short-answer';
}

function validateDifficulty(diff: string): Difficulty {
  const valid: Difficulty[] = ['easy', 'medium', 'hard'];
  return valid.includes(diff as Difficulty) ? (diff as Difficulty) : 'medium';
}

export async function generateAssessment(input: AssignmentInput): Promise<GeneratedPaper> {
  const prompt = buildPrompt(input);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert educator and assessment designer. You always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error('Empty response from AI');

  return parseLLMResponse(rawContent);
}

// Fallback mock generator for testing without API key
export function generateMockAssessment(input: AssignmentInput): GeneratedPaper {
  const sectionAQuestions: Question[] = Array.from({ length: Math.ceil(input.totalQuestions * 0.4) }, (_, i) => ({
    id: uuidv4(),
    text: `Question ${i + 1}: Describe the fundamental concept of ${input.subject} as it relates to ${input.gradeLevel} curriculum standards.`,
    type: 'short-answer' as QuestionType,
    difficulty: (i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard') as Difficulty,
    marks: Math.round(input.totalMarks / input.totalQuestions),
  }));

  const sectionBQuestions: Question[] = Array.from({ length: Math.floor(input.totalQuestions * 0.3) }, (_, i) => ({
    id: uuidv4(),
    text: `Multiple Choice ${i + 1}: Which of the following best describes a key principle of ${input.subject}?`,
    type: 'multiple-choice' as QuestionType,
    difficulty: (i % 2 === 0 ? 'easy' : 'medium') as Difficulty,
    marks: Math.round(input.totalMarks / input.totalQuestions),
    options: [
      'A) First possible answer to this question',
      'B) Second possible answer presented here',
      'C) Third option for the student to consider',
      'D) Fourth and final answer choice',
    ],
  }));

  const sectionCQuestions: Question[] = Array.from({ length: Math.floor(input.totalQuestions * 0.3) }, (_, i) => ({
    id: uuidv4(),
    text: `Essay Question ${i + 1}: Critically analyze and evaluate the impact of ${input.subject} concepts on modern applications. Provide examples to support your argument.`,
    type: 'long-answer' as QuestionType,
    difficulty: 'hard' as Difficulty,
    marks: Math.round((input.totalMarks / input.totalQuestions) * 2),
  }));

  const sections: Section[] = [
    {
      id: uuidv4(),
      title: 'Section A',
      instruction: 'Answer all questions. Each question carries equal marks.',
      questions: sectionAQuestions,
      totalMarks: sectionAQuestions.reduce((s, q) => s + q.marks, 0),
    },
    {
      id: uuidv4(),
      title: 'Section B',
      instruction: 'Choose the best answer for each question.',
      questions: sectionBQuestions,
      totalMarks: sectionBQuestions.reduce((s, q) => s + q.marks, 0),
    },
    {
      id: uuidv4(),
      title: 'Section C',
      instruction: 'Answer any two questions. Each question carries equal marks.',
      questions: sectionCQuestions,
      totalMarks: sectionCQuestions.reduce((s, q) => s + q.marks, 0),
    },
  ];

  return {
    title: input.title,
    subject: input.subject,
    duration: input.duration || '3 hours',
    totalMarks: input.totalMarks,
    sections,
    generatedAt: new Date().toISOString(),
  };
}
