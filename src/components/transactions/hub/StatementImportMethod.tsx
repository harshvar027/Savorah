import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileSpreadsheet } from 'lucide-react';
import { UploadDropzone } from './UploadDropzone';
import { AIProgressStepper, ProgressStep } from './AIProgressStepper';
import { parseStatement, StatementRow } from '../../../services/transactionImportServices';
import { ImportPreviewTable } from './ImportPreviewTable';
import { useFinance } from '../../../context/FinanceContext';

const PARSE_STEPS: ProgressStep[] = [
  { label: 'Uploading…', duration: 350 },
  { label: 'Reading Statement…', duration: 550 },
  { label: 'Detecting Transactions…', duration: 700 },
  { label: 'Categorizing with AI…', duration: 900 },
  { label: 'Checking for Duplicates…', duration: 400 },
];

type Stage = 'upload' | 'processing' | 'preview';

interface StatementImportMethodProps {
  onImported: (count: number) => void;
  onCancel: () => void;
}

export const StatementImportMethod: React.FC<StatementImportMethodProps> = ({ onImported, onCancel }) => {
  const { transactions, addTransaction } = useFinance();
  const [stage, setStage] = useState<Stage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const pendingRows = React.useRef<StatementRow[]>([]);

  const handleFile = (f: File) => setFile(f);

  const handleStartParse = async () => {
    if (!file) return;
    setStage('processing');
    try {
      const parsed = await parseStatement(file, transactions);
      pendingRows.current = parsed;
    } catch (e) {
      console.error(e);
      setStage('upload');
    }
  };

  const handleStepperComplete = () => {
    setRows(pendingRows.current);
    setStage('preview');
  };

  const handleImport = (selected: StatementRow[]) => {
    selected.forEach((row) => {
      const { id: _id, isDuplicate: _dup, selected: _sel, source: _src, confidence: _conf, ...payload } = row;
      addTransaction(payload);
    });
    onImported(selected.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <UploadDropzone
              onFileSelect={handleFile}
              accept=".csv,.xlsx,.pdf"
              label="Drop your bank statement here"
              sublabel="Supports CSV, Excel (.xlsx), PDF"
              acceptedTypes={['CSV', 'XLSX', 'PDF']}
              file={file}
              onClear={() => setFile(null)}
            />
            {!file && (
              <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">Supported formats</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>CSV exports from any bank</li>
                  <li>Excel (.xlsx) statements</li>
                  <li>PDF bank statements (text-based)</li>
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleStartParse}
                disabled={!file}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Parse Statement with AI
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200"
          >
            <AIProgressStepper
              steps={PARSE_STEPS}
              onComplete={handleStepperComplete}
              title="AI Statement Parser"
              icon={<FileSpreadsheet className="w-4 h-4" />}
            />
          </motion.div>
        )}

        {stage === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ImportPreviewTable
              rows={rows}
              onImport={handleImport}
              onCancel={() => setStage('upload')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
