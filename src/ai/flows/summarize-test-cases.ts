'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate summaries of potential test cases for a group of code files.
 *
 * - summarizeTestCases - A function that accepts code files and returns a summary of potential test cases.
 * - SummarizeTestCasesInput - The input type for the summarizeTestCases function.
 * - SummarizeTestCasesOutput - The return type for the summarizeTestCases function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTestCasesInputSchema = z.object({
  codeFiles: z.array(
    z.object({
      name: z.string().describe('The name of the code file.'),
      content: z.string().describe('The content of the code file.'),
    })
  ).describe('An array of code files to generate test case summaries for.'),
});
export type SummarizeTestCasesInput = z.infer<typeof SummarizeTestCasesInputSchema>;

const SummarizeTestCasesOutputSchema = z.object({
  testCaseSummaries: z.array(
    z.string().describe('A summary of a potential test case.')
  ).describe('An array of test case summaries.'),
});
export type SummarizeTestCasesOutput = z.infer<typeof SummarizeTestCasesOutputSchema>;

export async function summarizeTestCases(input: SummarizeTestCasesInput): Promise<SummarizeTestCasesOutput> {
  return summarizeTestCasesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTestCasesPrompt',
  input: {schema: SummarizeTestCasesInputSchema},
  output: {schema: SummarizeTestCasesOutputSchema},
  prompt: `You are an AI test case generator. You will receive a list of code files, and you will generate a list of potential test cases for those files. Each test case should be a single sentence describing the test.\n\nHere are the code files:\n\n{{#each codeFiles}}\nFile name: {{{this.name}}}\nFile content:\n{{{this.content}}}\n\n{{/each}}\n\nHere are the test case summaries, as a JSON array of strings:\n`,
});

const summarizeTestCasesFlow = ai.defineFlow(
  {
    name: 'summarizeTestCasesFlow',
    inputSchema: SummarizeTestCasesInputSchema,
    outputSchema: SummarizeTestCasesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
