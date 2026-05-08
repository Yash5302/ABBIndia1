import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Upload, Home, Bot, ArrowLeftToLine, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from "xlsx";
import initialData from "./data.json";
import tecnoLogo from "./assets/tecnoLogo.webp";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const App = () => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem("agm_dashboard_data");
    return saved ? JSON.parse(saved) : initialData;
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSpeaker, setActiveSpeaker] = useState("All");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionMenu, setQuestionMenu] = useState(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const [apiCounts, setApiCounts] = useState({
    Total: 0,
    General: 0,
    Finance: 0,
    Tax: 0,
  });
  const fileInputRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      // Fetch all questions
      const questionsResponse = await fetch(
        "https://abbbackend.onrender.com/api/questions",
      );
      const questionsResult = await questionsResponse.json();
      setData(questionsResult);

      // Fetch category counts
      const countsResponse = await fetch(
        "https://abbbackend.onrender.com/api/questions/count/all-categories",
      );
      const countsResult = await countsResponse.json();

      const total = Object.values(countsResult).reduce(
        (acc, val) => acc + parseInt(val || 0),
        0,
      );

      setApiCounts({
        General: parseInt(countsResult.General || 0),
        Finance: parseInt(countsResult.Finance || 0),
        Tax: parseInt(countsResult.Tax || 0),
        Total: total,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const closeDetailsModal = () => {
    setIsModalClosing(true);
    window.setTimeout(() => {
      setSelectedQuestion(null);
      setIsModalClosing(false);
    }, 220);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("agm_dashboard_data", JSON.stringify(data));
  }, [data]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsUploading(true);
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (parsedData.length > 0) {
          // Send parsed data to the API wrapped in a 'data' property
          const response = await fetch(
            "https://abbbackend.onrender.com/api/upload-json",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ data: parsedData }),
            },
          );

          if (response.ok) {
            console.log("Data uploaded successfully");
            await fetchDashboardData();
            setActiveCategory("All");
            setActiveSpeaker("All");
          } else {
            console.error("Upload failed:", response.statusText);
            alert("Upload failed. Please try again.");
          }
        }
      } catch (error) {
        console.error("Error parsing/uploading data:", error);
        alert("An error occurred during upload.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredSpeakers = useMemo(() => {
    const filtered = data.filter((item) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !s ||
        (item.Question && item.Question.toLowerCase().includes(s)) ||
        (item["Speaker Name"] &&
          item["Speaker Name"].toLowerCase().includes(s)) ||
        (item.ID && String(item.ID).toLowerCase().includes(s));
      const matchesCategory =
        activeCategory === "All" || item.Category === activeCategory;
      const matchesSpeaker =
        activeSpeaker === "All" || item["Speaker Name"] === activeSpeaker;
      return matchesSearch && matchesCategory && matchesSpeaker;
    });

    // Group by speaker name to avoid duplicates
    const groups = filtered.reduce((acc, item) => {
      const name = item["Speaker Name"] || "Unknown Speaker";
      if (!acc[name]) {
        acc[name] = {
          speakerName: name,
          questions: [],
          category: item.Category,
          id: item.ID,
        };
      }
      acc[name].questions.push(item);
      return acc;
    }, {});

    return Object.values(groups);
  }, [data, searchTerm, activeCategory, activeSpeaker]);

  const menuQuestions = useMemo(() => {
    if (!questionMenu?.speakerName) return [];
    const speaker = filteredSpeakers.find(
      (s) => s.speakerName === questionMenu.speakerName,
    );
    return speaker ? speaker.questions : [];
  }, [filteredSpeakers, questionMenu?.speakerName]);

  const countryPrefixes = [
    "USA F",
    "AUS C",
    "CAN D",
    "EGY E",
    "BRA F",
    "JPN G",
    "RUS H",
    "KEN I",
    "DNK J",
    "IND K",
    "UAE L",
    "GER M",
    "ITA N",
    "EGY O",
  ];
  const idNums = [
    "007K9823 4",
    "00B34125 10",
    "009M7831 7",
    "010P6504 3",
    "011Q9342 5",
    "012R2876 8",
    "01354719 2",
    "014TE530 6",
    "015U8647 1",
    "016V3902 4",
    "017W1289 9",
    "018X5473 0",
    "019Y2386 7",
    "02026728 2",
  ];
  const generateId = (i) =>
    `${countryPrefixes[i % countryPrefixes.length]} ${idNums[i % idNums.length]}`;

  // Color squares cycling through colors matching the reference image
  const dotColors = [
    "#F59E0B",
    "#EF4444",
    "#EF4444",
    "#EF4444",
    "#10B981",
    "#EF4444",
    "#EF4444",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#10B981",
    "#EF4444",
    "#EF4444",
  ];

  return (
    <div className="h-screen bg-white p-4 font-sans antialiased overflow-hidden">
      {/* Upload Loader Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-[#E2E8F0]">
            <Loader2 className="w-10 h-10 text-[#2196F3] animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[15px] font-semibold text-[#334155]">
                Uploading Data
              </span>
              <span className="text-[12px] text-[#64748B] font-medium">
                Please wait while we process your file...
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="h-full flex gap-4 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <aside className="w-[248px] min-w-[248px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden flex flex-col h-full shrink-0">
          {/* Logo + Collapse */}
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <img src="/abbLogo.png" alt="ABB" className="h-8 w-auto" />
            <button
              type="button"
              aria-label="Collapse sidebar"
              className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <ArrowLeftToLine size={14} />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-[#E2E8F0]" />

          {/* Navigation */}
          <nav className="px-5 mt-4 space-y-2">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Home size={16} className="text-[#64748B]" />
              <span>
                Speakers{" "}
                <span className="text-[12px] text-[#FF000F] font-semibold">
                  (Live)
                </span>
              </span>
            </button>
            <button
              type="button"
              aria-current="page"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold bg-[#2196F3] text-white shadow-sm cursor-pointer"
            >
              <Bot size={16} />
              <span>Q&A Insights</span>
            </button>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divider */}
          <div className="mx-5 h-px bg-[#E2E8F0]" />

          {/* Footer Logo */}
          <div className="px-5 py-6">
            <img src={tecnoLogo} alt="TecnoPrism" className="h-8 w-auto" />
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header Bar */}
          <div className="pt-0 shrink-0">
            <header className="h-20 bg-[#F6F7FB] border border-[#E2E8F0] rounded-2xl flex items-center justify-between px-6 shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src="/abbLogo.png"
                  alt="ABB"
                  className="h-7 w-auto shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-[14px] font-semibold text-[#334155] leading-tight tracking-tight m-0 truncate">
                    ABB India Ltd. - AGM 2026
                  </h1>
                  <p className="text-[11px] text-[#94A3B8] font-medium leading-tight mt-0.5 m-0 truncate">
                    Shareholder Session — Board Presentations
                  </p>
                </div>
              </div>
              <div className="bg-[#1976D2] text-white px-4 py-1.5 rounded-xl text-[13px] font-semibold font-mono tracking-wide">
                {currentTime.toLocaleTimeString("en-GB", { hour12: false })}
              </div>
            </header>
          </div>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto pb-6">
            <div className="mt-5 bg-[#F6F7FB] border border-[#E2E8F0] rounded-2xl p-5 space-y-5">
              {/* Title Row */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#334155] tracking-tight leading-tight m-0">
                    Leadership Discussion Dashboard
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] font-medium mt-1 m-0">
                    Organized speaker discussions, classifications, and
                    actionable insights
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="h-9 flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3.5 min-w-[280px] focus-within:border-[#2196F3] focus-within:shadow-[0_0_0_3px_rgba(33,150,243,0.12)] transition-all">
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search ID or Name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-none outline-none bg-transparent text-[12px] text-[#475569] font-medium w-full placeholder:text-[#94A3B8]"
                    />
                  </div>
                  {/* Upload */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={isUploading}
                    className="h-9 flex items-center gap-2 px-4 border border-[#2196F3] text-[#2196F3] rounded-xl text-[12px] font-semibold bg-white hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload size={15} />
                    {isUploading ? "Uploading..." : "Upload Excel"}
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveCategory("All")}
                  className={cn(
                    "bg-white border rounded-2xl px-5 py-4 h-[86px] flex flex-col justify-between cursor-pointer transition-all hover:shadow-md",
                    activeCategory === "All" ? "border-[#2196F3] ring-1 ring-[#2196F3]" : "border-[#E2E8F0]",
                  )}
                >
                  <span className="text-[11px] font-medium text-[#94A3B8] block">
                    Total Q&A
                  </span>
                  <div className="text-[18px] font-bold text-[#2196F3] leading-none">
                    {apiCounts.Total}
                  </div>
                </div>
                <div
                  onClick={() => setActiveCategory("General")}
                  className={cn(
                    "bg-white border rounded-2xl px-5 py-4 h-[86px] flex flex-col justify-between cursor-pointer transition-all hover:shadow-md",
                    activeCategory === "General" ? "border-[#F59E0B] ring-1 ring-[#F59E0B]" : "border-[#E2E8F0]",
                  )}
                >
                  <span className="text-[11px] font-medium text-[#94A3B8] block">
                    General
                  </span>
                  <div className="text-[18px] font-bold text-[#F59E0B] leading-none">
                    {apiCounts.General}
                  </div>
                </div>
                <div
                  onClick={() => setActiveCategory("Finance")}
                  className={cn(
                    "bg-white border rounded-2xl px-5 py-4 h-[86px] flex flex-col justify-between cursor-pointer transition-all hover:shadow-md",
                    activeCategory === "Finance" ? "border-[#10B981] ring-1 ring-[#10B981]" : "border-[#E2E8F0]",
                  )}
                >
                  <span className="text-[11px] font-medium text-[#94A3B8] block">
                    Finance
                  </span>
                  <div className="text-[18px] font-bold text-[#10B981] leading-none">
                    {apiCounts.Finance}
                  </div>
                </div>
                <div
                  onClick={() => setActiveCategory("Tax")}
                  className={cn(
                    "bg-white border rounded-2xl px-5 py-4 h-[86px] flex flex-col justify-between cursor-pointer transition-all hover:shadow-md",
                    activeCategory === "Tax" ? "border-[#EF4444] ring-1 ring-[#EF4444]" : "border-[#E2E8F0]",
                  )}
                >
                  <span className="text-[11px] font-medium text-[#94A3B8] block">
                    Tax
                  </span>
                  <div className="text-[18px] font-bold text-[#EF4444] leading-none">
                    {apiCounts.Tax}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[180px]" />
                    <col className="w-[220px]" />
                    <col />
                    <col className="w-[160px]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#EEF2F7] border-b border-[#E2E8F0]">
                      <th className="px-6 py-2.5 text-[11px] font-semibold text-[#64748B]">
                        ID
                      </th>
                      <th className="px-6 py-2.5 text-[11px] font-semibold text-[#64748B]">
                        Speaker Name
                      </th>
                      <th className="px-6 py-2.5 text-[11px] font-semibold text-[#64748B]">
                        Question
                      </th>
                      <th className="px-6 py-2.5 text-[11px] font-semibold text-[#64748B] text-right">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpeakers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[14px] font-semibold text-[#334155]">
                              No data is available
                            </span>
                            <span className="text-[12px] text-[#94A3B8] font-medium">
                              Try uploading an Excel file to get started
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSpeakers.map((speaker, idx) => {
                        const displayId = generateId(idx);
                        const isOpen =
                          questionMenu?.speakerName === speaker.speakerName;
                        const firstQuestion = speaker.questions[0] || {};

                        return (
                          <React.Fragment key={`${speaker.speakerName}-${idx}`}>
                            <tr
                              className={cn(
                                "border-b border-[#E2E8F0] cursor-pointer",
                                idx % 2 === 1 && "bg-[#F0F7FF]",
                                isOpen &&
                                  "border-b-0 bg-white shadow-sm relative z-[1]",
                              )}
                              onClick={() => {
                                setQuestionMenu((prev) => {
                                  if (
                                    prev?.speakerName === speaker.speakerName
                                  ) {
                                    return null;
                                  }
                                  return {
                                    rowIdx: idx,
                                    speakerName: speaker.speakerName,
                                    displayId,
                                    category: speaker.category,
                                    question: firstQuestion.Question,
                                    qLabel: `Q${idx + 1}`,
                                  };
                                });
                              }}
                            >
                              <td className="px-6 py-3.5 text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">
                                {displayId}
                              </td>
                              <td className="px-6 py-3.5 text-[11px] font-medium text-[#475569]">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="truncate">
                                    {speaker.speakerName}
                                  </span>
                                  <span className="inline-flex items-center justify-center h-5 min-w-7 px-2 rounded-sm bg-[#FDE68A] font-regular text-[10px]  leading-none shrink-0">
                                    {speaker.questions.length > 1
                                      ? `Q${speaker.questions.length}`
                                      : "Q1"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="text-[11px] font-medium text-[#64748B] leading-snug">
                                  {speaker.questions.length > 1
                                    ? `${firstQuestion.Question} (and ${speaker.questions.length - 1} more...)`
                                    : firstQuestion.Question}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-[11px] font-medium text-[#64748B] text-right whitespace-nowrap">
                                {speaker.category}
                              </td>
                            </tr>

                            {isOpen && (
                              <tr className="border-b border-[#E2E8F0]">
                                <td colSpan={4} className="p-0">
                                  <div className="bg-[#FFF7ED] border-t border-[#E2E8F0]">
                                    <div className="px-6 py-3 text-[11px] font-semibold text-[#334155]">
                                      Questions :
                                    </div>

                                    <div className="border-t border-[#E2E8F0]">
                                      {menuQuestions.map((q, qIdx) => (
                                        <div
                                          key={`${qIdx}-${q.Question}`}
                                          className="px-6 py-4 flex items-start gap-3 border-b border-[#E2E8F0] last:border-b-0 bg-[#FFF7ED] cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuestion({
                                              ...q,
                                              qIndex: qIdx + 1,
                                            });
                                          }}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setSelectedQuestion({
                                                ...q,
                                                qIndex: qIdx + 1,
                                              });
                                            }
                                          }}
                                        >
                                          <span className="inline-flex items-center justify-center h-4 min-w-5 px-1.5 rounded-sm bg-[#FDE68A] text-[#8A5B00] text-[9px] font-bold leading-none shrink-0 mt-0.5">
                                            Q{qIdx + 1}
                                          </span>
                                          <span className="text-[11px] font-medium text-[#64748B] leading-snug">
                                            {q.Question}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* ===== SIDE MODAL ===== */}
        {selectedQuestion && (
          <div
            className="fixed inset-0 z-[100] flex justify-end py-[87px]"
            onClick={closeDetailsModal}
          >
            <div
              className={cn(
                "absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]",
                isModalClosing
                  ? "animate-[fadeOut_0.2s_ease-in_forwards]"
                  : "animate-[fadeIn_0.2s_ease-out]",
              )}
            />
            <div
              className={cn(
                "relative w-full max-w-[720px] bg-white shadow-2xl flex flex-col h-[calc(100vh-174px)] overflow-hidden rounded-l-2xl",
                isModalClosing
                  ? "animate-[slideOut_0.2s_ease-in_forwards]"
                  : "animate-[slideIn_0.25s_ease-out]",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0 bg-[#EEF2F7]">
                <h3 className="text-[13px] font-semibold text-[#334155] tracking-tight m-0">
                  Question {selectedQuestion.qIndex} Details
                </h3>
                <button
                  type="button"
                  onClick={closeDetailsModal}
                  className="p-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-white/70 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <p className="text-[12px] text-[#64748B] leading-[1.85] font-medium m-0">
                  {selectedQuestion.Summery}
                </p>

                {selectedQuestion["Short Summary"] && (
                  <div className="mt-5">
                    <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Short Summary
                    </div>
                    <div className="text-[12px] text-[#64748B] font-medium leading-[1.85] mt-2">
                      {selectedQuestion["Short Summary"]}
                    </div>
                  </div>
                )}

                <div className="h-px bg-[#E2E8F0] w-full my-6" />

                <div className="bg-[#FFF7ED] rounded-xl px-6 py-4">
                  <span className="text-[12px] font-semibold text-[#334155]">
                    Detailed Points
                  </span>
                </div>

                <div className="mt-5 space-y-5">
                  {(selectedQuestion["Detailed Points"]
                    ? selectedQuestion["Detailed Points"].split("|")
                    : []
                  ).map((point, pIdx) => {
                    let title = "";
                    let desc = "";

                    // Check for ** first as a title marker
                    if (point.includes("**")) {
                      const parts = point.split("**");
                      title = parts[0].trim();
                      desc = parts.slice(1).join("**").trim();
                    }
                    // Fallback to : if no ** found, but only if it's early in the text
                    else if (point.includes(":") && point.indexOf(":") < 50) {
                      const idx = point.indexOf(":");
                      title = point.substring(0, idx + 1).trim();
                      desc = point.substring(idx + 1).trim();
                    }

                    // If title exists but description is empty, don't treat it as a title
                    if (title && !desc) {
                      desc = point.trim();
                      title = "";
                    } else if (!title) {
                      desc = point.trim();
                    }

                    return (
                      <div key={pIdx} className="flex gap-4">
                        <span className="text-[12px] font-semibold text-[#2196F3] shrink-0 mt-0.5 w-6 text-right">
                          {pIdx + 1}.
                        </span>
                        <div className="space-y-1 min-w-0">
                          {title && (
                            <span className="text-[12px] font-semibold text-[#2196F3] block">
                              {title.replace(/[:*]/g, "").trim()}:
                            </span>
                          )}
                          <p className="text-[12px] text-[#64748B] leading-[1.85] font-medium m-0">
                            {desc.replace(/^[0-9.]+\s*/, "").trim()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedQuestion.Source && (
                  <div className="mt-6">
                    <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Source
                    </div>
                    <div className="text-[12px] text-[#64748B] font-medium leading-[1.85] mt-2">
                      {selectedQuestion.Source}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @keyframes slideOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      </div>
    </div>
  );
};

export default App;
