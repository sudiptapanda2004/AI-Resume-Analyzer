import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, FileText, Sparkles, Target, Loader2 } from "lucide-react";
import { Button, Alert } from "@mui/material";
import * as mammoth from "mammoth";

// All function imports and logic remain unchanged.
const API_BASES = [
  import.meta.env.VITE_API_URL,
  "http://127.0.0.1:8001",
  "http://127.0.0.1:8000",
  "http://localhost:8001",
  "http://localhost:8000",
].filter(Boolean) as string[];

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).href;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text.trim();
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
}

export default function Home() {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All handler functions remain unchanged.
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const valid =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".docx");
    if (!valid) {
      setError("Only PDF and DOCX files are supported.");
      return;
    }
    setError(null);
    setResumeFile(file);
  };

  const handleAnalyze = async () => {
    if (!resumeFile) return;
    setLoading(true);
    setError(null);

    try {
      const resumeText = await extractTextFromFile(resumeFile);

      if (!resumeText || resumeText.length < 50) {
        throw new Error(
          "Could not extract readable text from the resume. Please ensure the file is not scanned/image-only."
        );
      }

      let lastError: Error | null = null;
      let response: Response | null = null;

      for (const base of API_BASES) {
        try {
          response = await fetch(`${base}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resume_text: resumeText,
              job_description: jobDescription,
              file_name: resumeFile.name,
            }),
          });

          if (response.ok) {
            break;
          }

          const errData = await response.json().catch(() => ({}));
          lastError = new Error(
            errData.detail || `Server error: ${response.status}`
          );
        } catch (error) {
          lastError = error as Error;
        }
      }

      if (!response?.ok) {
        throw (
          lastError ||
          new Error(
            "Unable to reach the analysis server. Please make sure the backend is running."
          )
        );
      }

      const data = await response.json();
      sessionStorage.setItem("analysisResult", JSON.stringify(data));
      sessionStorage.setItem("resumeFileName", resumeFile.name);
      navigate("/results");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // UPDATED INTERMEDIATE BACKGROUND (deep slate blue/grey - bg-slate-800)
    <div className="min-h-screen bg-slate-800">
      {/* UPDATED REFINED HERO SECTION
        This section uses a deep charcoal grey (bg-slate-900) to create a dramatic look.
      */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-700/60 py-16 px-6 sm:px-8 lg:px-12">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Status Badges - updated border/text colors for contrast */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Nathcorp Internship Project
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Developer Mode
            </span>
          </div>

          {/* Main Title Typography - MAINTAINED AS WHITE/GRADIENT */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            AI Resume Analyzer{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              & Skills Matcher
            </span>
          </h1>

          {/* Detailed Description text - updated to a light grey for contrast */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed mb-8">
            Upload your resume alongside a job description to calculate an
            instant ATS compatibility match score, map critical skill gaps, and
            generate customized interview prep questions—powered by advanced
            Groq AI.
          </p>

          {/* Feature Row Layout - updated for light grey text */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate-400 border-t border-slate-700/60 pt-6 max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span> PDF/DOCX Parsing
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">✓</span> Intelligent Skill Gap
              Mapping
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pink-400">✓</span> Real-time ATS Analytics
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT (Dual Card Layout)
        This section is placed on the deep slate blue/grey page background.
        The cards themselves are white to maintain stark definition for inputs.
      */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <Alert severity="error" className="mb-6" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Resume Card */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Upload className="size-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl">1. Upload Resume</h2>
                <p className="text-sm text-slate-600">
                  Supported formats: PDF and DOCX
                </p>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 hover:border-indigo-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {resumeFile ? (
                <div className="space-y-4">
                  <div className="bg-indigo-100 p-4 rounded-lg inline-block">
                    <FileText className="size-12 text-indigo-600" />
                  </div>
                  <p className="font-medium text-slate-800">{resumeFile.name}</p>
                  <p className="text-sm text-slate-600">
                    {(resumeFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setResumeFile(null)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-100 p-4 rounded-lg inline-block">
                    <FileText className="size-12 text-slate-400" />
                  </div>
                  <div>
                    <p className="mb-2">
                      <label
                        htmlFor="file-upload"
                        className="text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Click to choose file
                      </label>
                    </p>
                    <p className="text-sm text-slate-600">or drag and drop</p>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Job Description Card */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FileText className="size-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl">2. Job Description</h2>
                <p className="text-sm text-slate-600">
                  Paste a target JD for matching and keyword analysis.
                  (Optional)
                </p>
              </div>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here for ATS matching, skill gap analysis, and targeted interview questions..."
              className="w-full h-64 p-4 border border-slate-300 rounded-xl resize-none text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Analyze Button */}
        <div className="mt-8 text-center">
          <Button
            variant="contained"
            size="large"
            onClick={handleAnalyze}
            disabled={!resumeFile || loading}
            startIcon={
              loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Sparkles className="size-5" />
              )
            }
            sx={{
              backgroundColor: "#5b21b6",
              "&:hover": { backgroundColor: "#4c1d95" },
              "&:disabled": { backgroundColor: "#6366f1" }, // Updated disabled color for dark mode
              borderRadius: "12px",
              padding: "12px 48px",
              fontSize: "16px",
              textTransform: "none",
            }}
          >
            {loading ? "Analyzing with Groq AI..." : "Run ATS + JD Analysis"}
          </Button>
          {loading && (
            <p className="text-sm text-slate-300 mt-3">
              Parsing resume and running AI analysis — this may take 10–20
              seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}