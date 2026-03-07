'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { ImportJob, CsvFieldMapping } from '@signalwave/shared';

const CONTACT_FIELDS = [
  { value: 'skip', label: 'Skip this column' },
  { value: 'email', label: 'Email Address' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'company', label: 'Company' },
  { value: 'phone', label: 'Phone' },
  { value: 'tags', label: 'Tags (comma-separated)' },
];

type WizardStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export default function ImportContactsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<CsvFieldMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseCsv = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1, 6).map(parseRow); // Preview first 5 rows
    return { headers, rows };
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file.', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvPreview(rows);

      // Auto-map columns
      const autoMappings: CsvFieldMapping[] = headers.map((header) => {
        const lowerHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        let field = 'skip';
        if (lowerHeader.includes('email')) field = 'email';
        else if (lowerHeader.includes('firstname') || lowerHeader === 'first') field = 'firstName';
        else if (lowerHeader.includes('lastname') || lowerHeader === 'last') field = 'lastName';
        else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) field = 'company';
        else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) field = 'phone';
        else if (lowerHeader.includes('tag')) field = 'tags';
        return { csvColumn: header, contactField: field };
      });
      setMappings(autoMappings);
      setStep('mapping');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    const emailMapping = mappings.find((m) => m.contactField === 'email');
    if (!emailMapping) {
      toast({ title: 'Missing mapping', description: 'You must map at least one column to Email Address.', variant: 'destructive' });
      return;
    }

    try {
      setImporting(true);
      setStep('importing');
      const token = await getToken();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mappings', JSON.stringify(mappings.filter((m) => m.contactField !== 'skip')));

      const result = await api<{ data: ImportJob }>('/contacts/import', {
        method: 'POST',
        token: token || undefined,
        headers: {},
        body: formData,
      });

      setImportJob(result.data);
      setStep('complete');
    } catch {
      toast({ title: 'Import failed', description: 'Failed to import contacts. Please try again.', variant: 'destructive' });
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const updateMapping = (index: number, field: string) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, contactField: field } : m)));
  };

  const stepNumber = { upload: 1, mapping: 2, preview: 3, importing: 4, complete: 4 };
  const progressValue = (stepNumber[step] / 4) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Contacts</h1>
        <p className="text-muted-foreground">Upload a CSV file to bulk import contacts.</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className={step === 'upload' ? 'text-primary font-medium' : ''}>1. Upload</span>
          <span className={step === 'mapping' ? 'text-primary font-medium' : ''}>2. Map Columns</span>
          <span className={step === 'preview' ? 'text-primary font-medium' : ''}>3. Preview</span>
          <span className={step === 'importing' || step === 'complete' ? 'text-primary font-medium' : ''}>
            4. Import
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with your contacts. The first row should contain column headers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Drag and drop your CSV file here</h3>
              <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Maximum 10,000 contacts per import</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to contact fields. We have auto-detected some mappings for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {file && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary" className="text-xs">{csvPreview.length} preview rows</Badge>
              </div>
            )}

            <div className="space-y-3">
              {csvHeaders.map((header, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground">CSV Column</Label>
                    <div className="font-medium text-sm mt-1">{header}</div>
                    {csvPreview[0] && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        e.g., &quot;{csvPreview[0][index] || ''}&quot;
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground">Contact Field</Label>
                    <Select
                      value={mappings[index]?.contactField || 'skip'}
                      onValueChange={(v) => updateMapping(index, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            {!mappings.some((m) => m.contactField === 'email') && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">You must map at least one column to Email Address.</span>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>
                Back
              </Button>
              <Button onClick={() => setStep('preview')} disabled={!mappings.some((m) => m.contactField === 'email')}>
                Continue to Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>
              Review the first few rows of your import before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {mappings
                      .filter((m) => m.contactField !== 'skip')
                      .map((m, i) => (
                        <TableHead key={i}>
                          <div className="text-xs text-muted-foreground">{m.csvColumn}</div>
                          <div className="font-medium">
                            {CONTACT_FIELDS.find((f) => f.value === m.contactField)?.label || m.contactField}
                          </div>
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {mappings
                        .filter((m) => m.contactField !== 'skip')
                        .map((m, colIndex) => {
                          const originalIndex = csvHeaders.indexOf(m.csvColumn);
                          return (
                            <TableCell key={colIndex} className="text-sm">
                              {row[originalIndex] || '-'}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Ready to import from <strong>{file?.name}</strong>
              </span>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing / Complete */}
      {(step === 'importing' || step === 'complete') && (
        <Card>
          <CardHeader>
            <CardTitle>{step === 'importing' ? 'Importing...' : 'Import Complete'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'importing' ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Processing your contacts...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment.</p>
              </div>
            ) : importJob ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                  <p className="text-lg font-semibold">Import Completed</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{importJob.totalSubmitted}</p>
                    <p className="text-sm text-muted-foreground">Total Submitted</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{importJob.processed}</p>
                    <p className="text-sm text-green-600">Imported</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{importJob.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                </div>

                {importJob.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Errors</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importJob.errors.map((err, i) => (
                        <div key={i} className="text-xs p-2 bg-red-50 rounded flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                          <span>Row {err.row}: {err.email} - {err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button onClick={() => router.push('/contacts')}>
                    <Check className="mr-2 h-4 w-4" />
                    Go to Contacts
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
