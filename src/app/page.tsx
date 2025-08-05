'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  fetchRepoFiles,
  generateSummariesAction,
  generateCodeAction,
  createPRAction,
} from './actions';
import { Logo } from '@/components/icons';
import { Github, KeyRound, FileCode, List, Wand2, ClipboardCopy, GitMerge, LoaderCircle, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, AlertCircle, LockIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type FileNode = {
  path: string;
  type: string;
};

type AppState = 'initial' | 'files_loading' | 'files_loaded' | 'summaries_loading' | 'summaries_loaded' | 'code_loading' | 'code_loaded' | 'pr_loading' | 'pr_created' | 'error';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [primaryClassName, setPrimaryClassName] = useState('');
  const [testFileName, setTestFileName] =useState('');

  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<string[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [prUrl, setPrUrl] = useState('');

  const [appState, setAppState] = useState<AppState>('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleSelectFile = (path: string, checked: boolean) => {
    const newSelected = new Set(selectedFilePaths);
    if (checked) {
      newSelected.add(path);
    } else {
      newSelected.delete(path);
    }
    setSelectedFilePaths(newSelected);
  };

  const handleError = (error: any, message: string) => {
    console.error(error);
    const apiError = error.message ? JSON.parse(error.message) : { message: 'An unknown error occurred.'};
    setErrorMessage(`${message}: ${apiError.message}`);
    setAppState('error');
    toast({
      variant: 'destructive',
      title: 'Error',
      description: `${message}: ${apiError.message}`,
    });
  };

  const handleLoadFiles = async () => {
    setAppState('files_loading');
    setErrorMessage('');
    try {
      const { tree } = await fetchRepoFiles(repoUrl, pat);
      const codeFiles = tree.filter(file => file.type === 'blob' && (file.path.endsWith('.java') || file.path.endsWith('.js') || file.path.endsWith('.py') || file.path.endsWith('.tsx') || file.path.endsWith('.ts')));
      setFiles(codeFiles);
      setAppState('files_loaded');
    } catch (error) {
      handleError(error, 'Failed to load repository files');
    }
  };

  const handleGenerateSummaries = async () => {
    if (selectedFilePaths.size === 0) {
      toast({ title: 'No files selected', description: 'Please select one or more files to generate test cases.' });
      return;
    }
    setAppState('summaries_loading');
    setErrorMessage('');
    try {
      const selected = Array.from(selectedFilePaths);
      const { testCaseSummaries } = await generateSummariesAction(selected, repoUrl, pat);
      setSummaries(testCaseSummaries);
      setAppState('summaries_loaded');
    } catch (error) {
      handleError(error, 'Failed to generate test summaries');
    }
  };
  
  const handleGenerateCode = async () => {
    if (!selectedSummary) {
      toast({ title: 'No summary selected', description: 'Please select a test case summary to generate code.' });
      return;
    }
    if (!primaryClassName) {
        toast({ title: 'No class name provided', description: 'Please provide the primary class name to test.' });
        return;
    }
    setAppState('code_loading');
    setErrorMessage('');
    try {
      const contextFiles = Array.from(selectedFilePaths);
      const { testCode } = await generateCodeAction(contextFiles, repoUrl, pat, selectedSummary, primaryClassName);
      setGeneratedCode(testCode);
      setAppState('code_loaded');
      if (!testFileName) {
        setTestFileName(`${primaryClassName}Test.java`);
      }
    } catch (error) {
      handleError(error, 'Failed to generate test code');
    }
  };

  const handleCreatePr = async () => {
    if (!generatedCode) {
      toast({ title: 'No code generated', description: 'Please generate test code first.' });
      return;
    }
    if (!testFileName) {
        toast({ title: 'No filename provided', description: 'Please provide a filename for the test file.' });
        return;
    }
    setAppState('pr_loading');
    setErrorMessage('');
    try {
      const { html_url } = await createPRAction(repoUrl, pat, testFileName, generatedCode, `Feat: Add test case for ${primaryClassName}`);
      setPrUrl(html_url);
      setAppState('pr_created');
      toast({
        title: 'Pull Request Created!',
        description: 'Successfully created a new PR with the generated test case.',
      });
    } catch (error) {
      handleError(error, 'Failed to create Pull Request');
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast({ title: 'Copied to clipboard!', description: 'The generated test code has been copied.' });
  };
  
  const resetState = () => {
    setAppState('initial');
    setRepoUrl('');
    setPat('');
    setPrimaryClassName('');
    setTestFileName('');
    setFiles([]);
    setSelectedFilePaths(new Set());
    setSummaries([]);
    setSelectedSummary(null);
    setGeneratedCode('');
    setPrUrl('');
    setErrorMessage('');
  }

  const isLoading = appState.endsWith('_loading');

  const renderInitialState = () => (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Logo className="h-8 w-8 text-primary" />
              Connect to GitHub
            </CardTitle>
            <CardDescription>Connect your GitHub repository to generate test cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pat">GitHub Personal Access Token</Label>
              <Input id="pat" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={pat} onChange={(e) => setPat(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Create a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline text-primary">github.com/settings/tokens</a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository</Label>
              <Input id="repo-url" placeholder="username/repository-name" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
               <p className="text-xs text-muted-foreground">Format: owner/repository-name (e.g., facebook/react)</p>
            </div>
            <Button onClick={handleLoadFiles} disabled={!repoUrl || !pat} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Logo className="w-5 h-5 mr-2" />
              Connect Repository
            </Button>
            <p className="text-xs text-muted-foreground text-center">Your token is stored securely and only used to access your repository</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader>
             <CardTitle className="flex items-center gap-2 text-xl">
               <AlertCircle className="w-5 h-5 text-yellow-400" /> Getting Started
             </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-md bg-yellow-400/10 border border-yellow-400/20 text-sm">
              <p className="flex items-center gap-2"> <LockIcon className="w-4 h-4"/> To connect to GitHub, you'll need a Personal Access Token with 'repo' permissions.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Steps to use this application:</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center text-xs rounded-full bg-primary/20 text-primary-foreground h-5 w-5 mt-0.5">1</span>
                  <span>Create a GitHub Personal Access Token</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center text-xs rounded-full bg-primary/20 text-primary-foreground h-5 w-5 mt-0.5">2</span>
                   <span>Enter your token and repository (format: username/repo-name)</span>
                </li>
                <li className="flex items-start gap-3">
                   <span className="flex items-center justify-center text-xs rounded-full bg-primary/20 text-primary-foreground h-5 w-5 mt-0.5">3</span>
                   <span>Browse and select code files you want to generate tests for</span>
                </li>
                 <li className="flex items-start gap-3">
                   <span className="flex items-center justify-center text-xs rounded-full bg-primary/20 text-primary-foreground h-5 w-5 mt-0.5">4</span>
                   <span>Click "Generate Test Cases" to get AI suggestions</span>
                </li>
                <li className="flex items-start gap-3">
                   <span className="flex items-center justify-center text-xs rounded-full bg-primary/20 text-primary-foreground h-5 w-5 mt-0.5">5</span>
                   <span>Generate actual test code and optionally create a PR</span>
                </li>
              </ul>
            </div>

            <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noreferrer" className="w-full">
              <Button variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" /> Create Token
              </Button>
            </a>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Supported Languages:</strong> JavaScript, TypeScript, Python, Java, Go, Rust</p>
              <p><strong>Test Frameworks:</strong> Jest, JUnit, pytest (automatically detected)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAppWorkflow = () => (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Connect and Select Files */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><span className="flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground h-6 w-6">1</span> Review Files</CardTitle>
            <CardDescription>Select files for test generation from your repository.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex-1 flex flex-col min-h-0">
              <Label className="flex items-center gap-2 mb-2"><FileCode className="w-4 h-4" /> Code Files</Label>
              <div className="border rounded-md flex-1">
                <ScrollArea className="h-72">
                  <div className="p-4">
                    {appState === 'files_loading' && (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    )}
                    {files.length > 0 && (
                      <ul className="space-y-2">
                        {files.map(file => (
                          <li key={file.path} className="flex items-center space-x-2">
                            <Checkbox 
                              id={file.path} 
                              onCheckedChange={(checked) => handleSelectFile(file.path, !!checked)}
                              disabled={isLoading}
                            />
                            <label htmlFor={file.path} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{file.path}</label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <Button onClick={handleGenerateSummaries} disabled={isLoading || selectedFilePaths.size === 0 || appState === 'summaries_loading'}>
              {appState === 'summaries_loading' && <LoaderCircle className="animate-spin mr-2"/>}
              Generate Test Summaries
            </Button>
          </CardContent>
        </Card>

        {/* Column 2: Select Summary & Generate Code */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><span className="flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground h-6 w-6">2</span> Review & Generate</CardTitle>
            <CardDescription>Select a test case summary and generate the corresponding test code.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
             <div className="flex-1 flex flex-col min-h-0">
                <Label className="flex items-center gap-2 mb-2"><List className="w-4 h-4"/>Test Case Summaries</Label>
                <div className="border rounded-md flex-1">
                  <ScrollArea className="h-72">
                    <div className="p-4">
                        {appState === 'summaries_loading' && (
                           <div className="space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-5/6" />
                            <Skeleton className="h-6 w-3/4" />
                          </div>
                        )}
                        {appState !== 'summaries_loading' && summaries.length === 0 && (
                           <p className="text-sm text-muted-foreground text-center py-10">Generate summaries to see them here.</p>
                        )}
                        {summaries.length > 0 && (
                          <RadioGroup onValueChange={setSelectedSummary} value={selectedSummary || ''} disabled={isLoading}>
                            {summaries.map((summary, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={summary} id={`summary-${index}`} />
                                <Label htmlFor={`summary-${index}`}>{summary}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                    </div>
                  </ScrollArea>
                </div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="class-name">Primary Class Name to Test</Label>
                <Input id="class-name" placeholder="e.g., Calculator" value={primaryClassName} onChange={(e) => setPrimaryClassName(e.target.value)} disabled={isLoading || summaries.length === 0} />
             </div>
             <Button onClick={handleGenerateCode} disabled={isLoading || !selectedSummary || !primaryClassName}>
                {appState === 'code_loading' && <LoaderCircle className="animate-spin mr-2"/>}
                <Wand2 className="mr-2"/> Generate Test Code
             </Button>
          </CardContent>
        </Card>

        {/* Column 3: View Code & Create PR */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><span className="flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground h-6 w-6">3</span> Commit</CardTitle>
            <CardDescription>Review the generated test code and create a pull request on GitHub.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex-1 flex flex-col min-h-0 relative">
              <Label className="flex items-center gap-2 mb-2">Generated Code</Label>
              <div className="border rounded-md flex-1 bg-muted/30">
                <ScrollArea className="h-72">
                  <pre className="p-4 font-code text-sm whitespace-pre-wrap break-all">
                     {appState === 'code_loading' && <Skeleton className="h-24 w-full" />}
                     {appState !== 'code_loading' && !generatedCode && <span className="text-muted-foreground">Generate code to see it here.</span>}
                     {generatedCode && <code>{generatedCode}</code>}
                  </pre>
                </ScrollArea>
              </div>
              {generatedCode && (
                  <Button variant="ghost" size="icon" className="absolute top-0 right-1" onClick={handleCopyCode}>
                      <ClipboardCopy className="w-4 h-4"/>
                  </Button>
              )}
            </div>
             <div className="space-y-2">
                <Label htmlFor="test-filename">Test Filename</Label>
                <Input id="test-filename" placeholder="e.g., MyClassTest.java" value={testFileName} onChange={(e) => setTestFileName(e.target.value)} disabled={isLoading || !generatedCode}/>
             </div>
            <Button onClick={handleCreatePr} disabled={isLoading || !generatedCode || !testFileName}>
              {appState === 'pr_loading' && <LoaderCircle className="animate-spin mr-2"/>}
              <GitMerge className="mr-2"/> Create Pull Request
            </Button>
            {appState === 'pr_created' && prUrl && (
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-400 flex flex-col items-center text-center gap-2">
                  <CheckCircle2 className="w-8 h-8"/>
                  <p className="font-semibold">Pull Request created successfully!</p>
                  <a href={prUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                          View on GitHub <ExternalLink className="w-4 h-4 ml-2"/>
                      </Button>
                  </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
       <header className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold font-headline">TestGenius</h1>
            <p className="text-muted-foreground">Generate unit tests with AI</p>
          </div>
        </div>
        {appState !== 'initial' && (
          <Button variant="ghost" onClick={resetState}>
            <RefreshCw className="mr-2 h-4 w-4" /> Start Over
          </Button>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {appState === 'error' && (
           <div className="p-4 md:p-6 lg:p-8">
            <Card className="mb-6 bg-destructive/10 border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle /> An Error Occurred
                </CardTitle>
                <CardDescription className="text-destructive">
                  {errorMessage}
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={() => setAppState(files.length > 0 ? 'files_loaded' : 'initial')}>
                      Go Back
                  </Button>
              </CardContent>
            </Card>
           </div>
        )}

        {appState === 'initial' && renderInitialState()}
        
        {appState !== 'initial' && appState !== 'error' && (
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            {renderAppWorkflow()}
          </div>
        )}
      </main>
    </div>
  );
}
