import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, FileText, Lightbulb, AlertCircle, CheckCircle2, HelpCircle, Briefcase, User, Mail, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Chip, LinearProgress, CircularProgress } from "@mui/material";

interface AnalysisResult {
  parsed_info: {
    name: string;
    email: string;
    phone: string;
    sections: string;
    skills: string[];
    education: { degree: string; institution: string; dates: string; grade?: string }[];
    experience: { title: string; company: string; dates: string; description: string }[];
  };
  ats_score: number;
  jd_match: number;
  ats_breakdown: { contact: number; sections: number; skills: number; keywords: number };
  strength_areas: string[];
  matching_skills: string[];
  missing_skills: string[];
  missing_keywords: string[];
  recommendations: string[];
  learning_suggestions: string[];
  interview_questions: {
    technical: { question: string; answer: string }[];
    behavioral: { question: string; answer: string }[];
    hr: { question: string; answer: string }[];
    scenario_based: { question: string; answer: string }[];
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeNumeric(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAnalysisResult(value: unknown): AnalysisResult {
  const source = (value ?? {}) as Record<string, any>;
  const parsedInfo = source.parsed_info ?? {};
  const breakdown = {
    contact: normalizeNumeric(source.ats_breakdown?.contact),
    sections: normalizeNumeric(source.ats_breakdown?.sections),
    skills: normalizeNumeric(source.ats_breakdown?.skills),
    keywords: normalizeNumeric(source.ats_breakdown?.keywords),
  };
  const computedScore = Math.max(0, Math.min(100, breakdown.contact + breakdown.sections + breakdown.skills + breakdown.keywords));

  return {
    parsed_info: {
      name: typeof parsedInfo.name === "string" ? parsedInfo.name : "",
      email: typeof parsedInfo.email === "string" ? parsedInfo.email : "",
      phone: typeof parsedInfo.phone === "string" ? parsedInfo.phone : "",
      sections: typeof parsedInfo.sections === "string" ? parsedInfo.sections : "",
      skills: toStringArray(parsedInfo.skills),
      education: Array.isArray(parsedInfo.education)
        ? parsedInfo.education.map((item: any) => ({
            degree: typeof item?.degree === "string" ? item.degree : "",
            institution: typeof item?.institution === "string" ? item.institution : "",
            dates: typeof item?.dates === "string" ? item.dates : "",
            grade: typeof item?.grade === "string" ? item.grade : undefined,
          }))
        : [],
      experience: Array.isArray(parsedInfo.experience)
        ? parsedInfo.experience.map((item: any) => ({
            title: typeof item?.title === "string" ? item.title : "",
            company: typeof item?.company === "string" ? item.company : "",
            dates: typeof item?.dates === "string" ? item.dates : "",
            description: typeof item?.description === "string" ? item.description : "",
          }))
        : [],
    },
    ats_score: computedScore > 0 ? computedScore : normalizeNumeric(source.ats_score),
    jd_match: normalizeNumeric(source.jd_match),
    ats_breakdown: breakdown,
    strength_areas: toStringArray(source.strength_areas),
    matching_skills: toStringArray(source.matching_skills),
    missing_skills: toStringArray(source.missing_skills),
    missing_keywords: toStringArray(source.missing_keywords),
    recommendations: toStringArray(source.recommendations),
    learning_suggestions: toStringArray(source.learning_suggestions),
    interview_questions: {
      technical: Array.isArray(source.interview_questions?.technical)
        ? source.interview_questions.technical.filter((item: any) => item && typeof item.question === "string" && typeof item.answer === "string")
        : [],
      behavioral: Array.isArray(source.interview_questions?.behavioral)
        ? source.interview_questions.behavioral.filter((item: any) => item && typeof item.question === "string" && typeof item.answer === "string")
        : [],
      hr: Array.isArray(source.interview_questions?.hr)
        ? source.interview_questions.hr.filter((item: any) => item && typeof item.question === "string" && typeof item.answer === "string")
        : [],
      scenario_based: Array.isArray(source.interview_questions?.scenario_based)
        ? source.interview_questions.scenario_based.filter((item: any) => item && typeof item.question === "string" && typeof item.answer === "string")
        : [],
    },
  };
}

function ScoreGaugeCard({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">{label}</h3>
        <div className="text-5xl font-black tracking-tight mb-2" style={{ color }}>
          {score}<span className="text-sm text-slate-400 font-normal">/100</span>
        </div>
      </div>
      <div>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: "#f1f5f9",
            "& .MuiLinearProgress-bar": { backgroundColor: color, borderRadius: 3 },
          }}
        />
        <span className="text-xs font-semibold block mt-2" style={{ color: `${color}e6` }}>
          {score >= 70 ? "Good Alignment" : score >= 40 ? "Needs Improvement" : "Low Score"}
        </span>
      </div>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "interview">("overview");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("analysisResult");
    const fileName = sessionStorage.getItem("resumeFileName");

    if (!raw || !fileName) {
      navigate("/");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setData(normalizeAnalysisResult(parsed));
      setResumeFileName(fileName);
    } catch {
      setError("Failed to load analysis results.");
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
          <AlertCircle className="size-12 text-rose-500 mx-auto" />
          <p className="text-slate-700 font-medium">{error}</p>
          <Button onClick={() => navigate("/")} variant="contained" sx={{ backgroundColor: "#4f46e5", '&:hover': { backgroundColor: "#4338ca" }, textTransform: 'none', borderRadius: '10px' }}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <CircularProgress sx={{ color: "#4f46e5" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Visual Ambient Background Decor */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Back Navigation Button */}
        <Button
          startIcon={<ArrowLeft className="size-4" />}
          onClick={() => navigate("/")}
          sx={{ 
            color: "#475569", 
            mb: 4, 
            textTransform: "none",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "6px 16px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            '&:hover': { color: '#0f172a', backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }
          }}
        >
          Analyze Another Resume
        </Button>

        {/* Brand Banner Block */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-md relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 bg-indigo-500/25 text-indigo-300 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-bl-xl border-l border-b border-slate-800">
            NATHCORP INTERNSHIP PROJECT
          </div>
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest block mb-1">Diagnostic Assessment</span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">AI Resume Analysis</h1>
          <p className="text-slate-300 text-sm flex items-center gap-2 flex-wrap font-medium">
            Target Record: <span className="bg-slate-800 text-slate-100 px-2.5 py-1 rounded-md font-mono text-xs border border-slate-700">{resumeFileName}</span>
          </p>
        </div>

        {/* Tab Navigation Swapper */}
        <div className="flex border border-slate-200 gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl max-w-md shadow-sm">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 text-center py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
              activeTab === "overview" 
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            Overview &amp; Analysis
          </button>
          <button
            onClick={() => setActiveTab("interview")}
            className={`flex-1 text-center py-2.5 px-4 text-sm font-bold rounded-lg transition-all duration-200 ${
              activeTab === "interview" 
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/40" 
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            Interview Preparation
          </button>
        </div>

        {/* Tab 1 Frame View: Overview & Analysis */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Score Cards row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <ScoreGaugeCard score={data.ats_score} label="ATS General Score" />
              <ScoreGaugeCard score={data.jd_match} label="Job Description Match" />

              {/* Struct Breakdown Scoreboard */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">ATS Breakdown Metrics</h3>
                <div className="space-y-2">
                  {Object.entries(data.ats_breakdown).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center text-xs sm:text-sm border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                      <span className="text-slate-600 font-medium capitalize">{key}</span>
                      <span className="font-mono font-bold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strength Badges Block Container */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Core Strength Factors</h3>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {data.strength_areas.length > 0 ? data.strength_areas.map((area, i) => (
                    <Chip
                      key={i}
                      label={area}
                      size="small"
                      sx={{ backgroundColor: "#e0e7ff", color: "#4f46e5", border: "1px solid #c7d2fe", fontSize: "11px", fontWeight: 700 }}
                    />
                  )) : <span className="text-xs text-slate-400 italic">None logged</span>}
                </div>
              </div>
            </div>

            {/* Extracted Workspace Profile Block Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <FileText className="size-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Parsed Profile Information</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Name Layer", value: data.parsed_info.name, icon: <User size={14} className="text-slate-500" /> },
                  { label: "Email Address", value: data.parsed_info.email, icon: <Mail size={14} className="text-indigo-600" /> },
                  { label: "Phone Line", value: data.parsed_info.phone, icon: <Phone size={14} className="text-slate-500" /> },
                  { label: "Identified Sections", value: data.parsed_info.sections },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{label}</p>
                    <p className="text-sm font-semibold text-slate-700 break-all flex items-center gap-1.5">{icon}{value || "Undetected"}</p>
                  </div>
                ))}
              </div>

              {/* Skills Tags row subpanel */}
              {data.parsed_info.skills.length > 0 && (
                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Extracted Competency Index</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.parsed_info.skills.map((skill, i) => (
                      <Chip key={i} label={skill} size="small" sx={{ backgroundColor: "#ffffff", color: "#334155", border: "1px solid #e2e8f0", fontWeight: 500 }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Timeline Subpanel row */}
              {data.parsed_info.education.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Academic Timeline</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.parsed_info.education.map((edu, i) => (
                      <div key={i} className="border-l-2 border-indigo-500 bg-slate-50/60 p-3.5 rounded-r-xl border-y border-r border-slate-100">
                        <p className="font-bold text-sm text-slate-800">{edu.degree}</p>
                        <p className="text-xs text-slate-500 my-0.5">{edu.dates} — <span className="text-slate-600 font-semibold">{edu.institution}</span></p>
                        {edu.grade && <p className="text-xs font-bold text-indigo-600 mt-1">{edu.grade}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Log Subpanel row */}
              {data.parsed_info.experience.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Milestones</h4>
                  <div className="space-y-4">
                    {data.parsed_info.experience.map((exp, i) => (
                      <div key={i} className="border-l-2 border-purple-500 bg-slate-50/60 p-4 rounded-r-xl border-y border-r border-slate-100">
                        <div className="flex flex-wrap justify-between items-start gap-1">
                          <div>
                            <p className="font-bold text-sm text-slate-800">{exp.title}</p>
                            <p className="text-xs text-purple-600 font-bold">{exp.company}</p>
                          </div>
                          <span className="text-xs font-mono text-slate-400 font-semibold">{exp.dates}</span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keyword Metric Skill Gap mapping panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><CheckCircle2 size={18} className="text-indigo-600" />Target Requirement Matrix</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="mb-3 text-sm font-bold text-emerald-700 flex items-center gap-1.5">✓ Matching Knowledge Pillars ({data.matching_skills.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.matching_skills.length > 0 ? data.matching_skills.map((skill, i) => (
                      <Chip key={i} label={skill} size="small" sx={{ backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", fontWeight: 600 }} />
                    )) : <p className="text-xs text-slate-500 italic">No direct matches logged</p>}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="mb-3 text-sm font-bold text-rose-700 flex items-center gap-1.5">✗ Missing Core Skills ({data.missing_skills.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.missing_skills.length > 0 ? data.missing_skills.map((skill, i) => (
                      <Chip key={i} label={skill} size="small" sx={{ backgroundColor: "#fee2e2", color: "#be123c", border: "1px solid #fecaca", fontWeight: 600 }} />
                    )) : <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 font-bold">Profile perfectly matches target criteria!</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Missing Contextual Target Keywords */}
            {data.missing_keywords.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-4">Absent Contextual Optimization Keywords</h2>
                <div className="flex flex-wrap gap-1.5">
                  {data.missing_keywords.map((kw, i) => (
                    <Chip key={i} label={kw} size="small" sx={{ backgroundColor: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", fontWeight: 600 }} />
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Strategy Revision Fixes layout cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-indigo-600">
                  <Lightbulb className="size-5" />
                  <h3 className="font-bold text-slate-800 text-base">Strategic Profile Fixes</h3>
                </div>
                <ol className="space-y-2.5">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-indigo-600 font-bold font-mono">0{i + 1}.</span>
                      <span className="font-medium">{rec}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-purple-600">
                  <FileText className="size-5" />
                  <h3 className="font-bold text-slate-800 text-base">Targeted Upskilling Paths</h3>
                </div>
                <ol className="space-y-2.5">
                  {data.learning_suggestions.map((s, i) => (
                    <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-purple-600 font-bold font-mono">✓</span>
                      <span className="font-medium">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2 Frame View: Interview Preparation Accordion */}
        {activeTab === "interview" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Predictive Technical Screening", key: "technical", icon: <HelpCircle size={16} />, color: "#6366f1", bg: "rgba(99, 102, 241, 0.05)" },
                { title: "Behavioral Situation Scenarios", key: "behavioral", icon: <Briefcase size={16} />, color: "#10b981", bg: "rgba(16, 185, 129, 0.05)" },
                { title: "Core HR Alignment Matrix", key: "hr", icon: <User size={16} />, color: "#a855f7", bg: "rgba(168, 85, 247, 0.05)" },
                { title: "Scenario Engineering Logic", key: "scenario_based", icon: <Lightbulb size={16} />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.05)" },
              ].map(({ title, key, icon, color, bg }) => (
                <div key={key} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">{icon}{title}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {(data.interview_questions[key as keyof typeof data.interview_questions] || []).map((item: any, i) => {
                      const id = `${key}-${i}`;
                      const isExpanded = openQuestion === id;

                      return (
                        <div key={id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 transition-all">
                          <button
                            onClick={() => setOpenQuestion(isExpanded ? null : id)}
                            className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100/60 transition flex justify-between items-center gap-3"
                          >
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                              {i + 1}. {item.question}
                            </span>
                            <span className="text-slate-400 shrink-0">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white border-l-2" style={{ borderColor: color }}>
                              <p className="font-bold text-slate-500 mb-1 text-[11px] uppercase tracking-wider">Suggested Response Framework:</p>
                              {item.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}