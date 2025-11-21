'use server';

/**
 * @fileOverview AI-powered feedback generation for faculty on their grading approach.
 *
 * - generateFeedback - A function that generates feedback for faculty based on their grading and remarks.
 * - FacultyFeedbackInput - The input type for the generateFeedback function.
 * - FacultyFeedbackOutput - The return type for the generateFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FacultyFeedbackInputSchema = z.object({
  gradingApproach: z
    .string()
    .describe('Description of the grading approach used by the faculty.'),
  remarks: z.string().describe('The remarks given by the faculty on assignments.'),
});

export type FacultyFeedbackInput = z.infer<typeof FacultyFeedbackInputSchema>;

const FacultyFeedbackOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'AI-generated suggestions for the faculty to improve their grading approach and feedback remarks.'
    ),
});

export type FacultyFeedbackOutput = z.infer<typeof FacultyFeedbackOutputSchema>;

export async function generateFeedback(
  input: FacultyFeedbackInput
): Promise<FacultyFeedbackOutput> {
  return facultyFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'facultyFeedbackPrompt',
  input: {schema: FacultyFeedbackInputSchema},
  output: {schema: FacultyFeedbackOutputSchema},
  prompt: `You are an AI assistant providing feedback to faculty members on their grading approach and remarks.

  Analyze the faculty's grading approach and remarks on student assignments and provide suggestions for improvement.

  Grading Approach: {{{gradingApproach}}}
  Remarks: {{{remarks}}}

  Suggestions:`,
});

const facultyFeedbackFlow = ai.defineFlow(
  {
    name: 'facultyFeedbackFlow',
    inputSchema: FacultyFeedbackInputSchema,
    outputSchema: FacultyFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
