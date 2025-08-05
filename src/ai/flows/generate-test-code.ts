'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating JUnit test code based on a test case summary.
 *
 * - generateTestCode - A function that generates JUnit test code from a test case summary.
 * - GenerateTestCodeInput - The input type for the generateTestCode function.
 * - GenerateTestCodeOutput - The return type for the generateTestCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTestCodeInputSchema = z.object({
  fileContent: z.string().describe('Content of the code file to be tested.'),
  testCaseSummary: z.string().describe('Summary of the test case to generate.'),
  className: z.string().describe('Name of the class to be tested.'),
});
export type GenerateTestCodeInput = z.infer<typeof GenerateTestCodeInputSchema>;

const GenerateTestCodeOutputSchema = z.object({
  testCode: z.string().describe('Generated JUnit test code.'),
});
export type GenerateTestCodeOutput = z.infer<typeof GenerateTestCodeOutputSchema>;

export async function generateTestCode(input: GenerateTestCodeInput): Promise<GenerateTestCodeOutput> {
  return generateTestCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTestCodePrompt',
  input: {schema: GenerateTestCodeInputSchema},
  output: {schema: GenerateTestCodeOutputSchema},
  prompt: `You are a JUnit test code generator.  Given the following code file content, class name and a test case summary, generate JUnit test code for the class.

Code File Content:
{{fileContent}}

Class Name:
{{className}}

Test Case Summary:
{{testCaseSummary}}

Ensure the generated test code is complete, correct, and includes all necessary imports.`, 
});

const generateTestCodeFlow = ai.defineFlow(
  {
    name: 'generateTestCodeFlow',
    inputSchema: GenerateTestCodeInputSchema,
    outputSchema: GenerateTestCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
