import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine } from 'lucide-react';
import { UploadDropzone } from './UploadDropzone';
import { AIProgressStepper, ProgressStep } from './AIProgressStepper';
import { parseReceiptImage, ExtractedTransaction } from '../../../services/transactionImportServices';

const SCAN_STEPS: ProgressStep[] = [
  { label: 'Scanning Receipt…', duration: 500 },
  { label: 'Reading Amount…', duration: 400 },
  { label: 'Extracting Merchant…', duration: 450 },
  { label: 'Detecting Date…', duration: 350 },
  { label: 'Categorizing Transaction…', duration: 600 },
];

type Stage = 'upload' | 'processing' | 'done';

interface ReceiptScanMethodProps {
  onExtracted: (tx: ExtractedTransaction) => void;
  onCancel: () => void;
}

export const ReceiptScanMethod: React.FC<ReceiptScanMethodProps> = ({ onExtracted, onCancel }) => {
  const [stage, setStage] = useState<Stage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleStartScan = async () => {
    if (!file) return;
    setStage('processing');
    try {
      const result = await parseReceiptImage(file);
      // onComplete in stepper will trigger — but we also need the result
      // Store it for when stepper finishes
      pendingResult.current = result;
    } catch (e) {
      console.error(e);
      setStage('upload');
    }
  };

  const pendingResult = React.useRef<ExtractedTransaction | null>(null);

  const handleStepperComplete = () => {
    setStage('done');
    if (pendingResult.current) {
      setTimeout(() => onExtracted(pendingResult.current!), 400);
    }
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
              accept="image/*,.pdf"
              label="Drop your bank receipt here"
              sublabel="Supports JPG, PNG, JPEG, PDF"
              acceptedTypes={['JPG', 'PNG', 'JPEG', 'PDF']}
              file={file}
              previewUrl={previewUrl}
              onClear={() => { setFile(null); setPreviewUrl(null); }}
            />
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
                onClick={handleStartScan}
                disabled={!file}
                className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                Scan with AI
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
              steps={SCAN_STEPS}
              onComplete={handleStepperComplete}
              title="AI Receipt Scan"
              icon={<ScanLine className="w-4 h-4" />}
            />
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center"
            >
              <ScanLine className="w-7 h-7 text-emerald-600" />
            </motion.div>
            <p className="text-sm font-extrabold text-slate-900">Extraction complete!</p>
            <p className="text-xs text-slate-500">Loading review form…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
