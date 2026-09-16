/**
 * Curated High-Impact LaTeX Templates for WriteTex
 * Includes Jake's Resume (SWE industry standard), Modern Tech, Academic CV, and Executive Letter.
 */

export interface LaTeXTemplate {
  id: string;
  title: string;
  category: 'resume' | 'cover_letter';
  badge: string;
  description: string;
  previewSnippet: string;
  fullLatex: string;
}

export const LATEX_TEMPLATES: LaTeXTemplate[] = [
  {
    id: 'template_jakes_resume',
    title: "Jake's Resume (Industry SWE Standard)",
    category: 'resume',
    badge: 'Most Popular · ATS 100%',
    description: 'The golden standard single-page tech resume. Clean, compact, ATS-parsable with modular macros.',
    previewSnippet: '\\resumeSubheading{Software Engineer}{June 2022 -- Present}{Google}{Mountain View, CA}',
    fullLatex: `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape Jane Doe} \\\\ \\vspace{1pt}
    \\small 123-456-7890 $|$ \\href{mailto:jane@example.com}{\\underline{jane@example.com}} $|$ 
    \\href{https://linkedin.com/in/janedoe}{\\underline{linkedin.com/in/janedoe}} $|$
    \\href{https://github.com/janedoe}{\\underline{github.com/janedoe}}
\\end{center}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {State University}{City, ST}
      {Bachelor of Science in Computer Science; Minor in Mathematics}{Aug. 2019 -- May 2023}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Software Engineer}{June 2023 -- Present}
      {Acme Tech Corp}{San Francisco, CA}
      \\resumeItemListStart
        \\resumeItem{Architected and deployed a distributed ingestion microservice in Go and Kafka, reducing latency by 35\\% across 10M daily events.}
        \\resumeItem{Spearheaded migration from monolith to Kubernetes and Terraform, achieving 99.99\\% uptime and saving \\$45k in monthly cloud costs.}
        \\resumeItem{Mentored 3 junior engineers and instituted automated CI/CD unit testing pipelines, raising test coverage from 62\\% to 94\\%.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Projects}
  \\resumeSubHeadingListStart
    \\resumeProjectHeading
      {\\textbf{Distributed Cache Engine} $|$ \\emph{Rust, Tokio, gRPC}}{\\href{https://github.com/janedoe/cache}{\\underline{github.com/janedoe/cache}}}
      \\resumeItemListStart
        \\resumeItem{Engineered a high-throughput, low-latency in-memory cache supporting consistent hashing and Raft consensus.}
        \\resumeItem{Benchmarked performance against Redis, achieving 250k QPS with sub-millisecond p99 latency.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: Go, Python, TypeScript, Rust, C++, SQL, Bash} \\\\
     \\textbf{Frameworks}{: React, Next.js, Node.js, FastAPI, gRPC, Tokio} \\\\
     \\textbf{Developer Tools}{: Git, Docker, Kubernetes, Terraform, AWS, Linux, CI/CD}
    }}
 \\end{itemize}

\\end{document}`
  },
  {
    id: 'template_modern_cover_letter',
    title: 'Modern Executive Cover Letter',
    category: 'cover_letter',
    badge: 'STAR Framework · High Impact',
    description: 'Polished single-page corporate letterhead with clear contact banner and 3-paragraph STAR narrative.',
    previewSnippet: '\\opening{Dear Hiring Team,} ... \\closing{Sincerely, Jane Doe}',
    fullLatex: `\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{xcolor}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{8pt}

\\begin{document}

\\begin{center}
    {\\Huge \\textbf{Jane Doe}} \\\\[4pt]
    \\small San Francisco, CA $|$ (123) 456-7890 $|$ \\href{mailto:jane@example.com}{jane@example.com} $|$ \\href{https://linkedin.com/in/janedoe}{linkedin.com/in/janedoe}
\\end{center}
\\vspace{6pt}
\\hrule
\\vspace{12pt}

\\textbf{Date:} \\today \\\\[4pt]
\\textbf{To:} Engineering Hiring Team \\\\
\\textbf{Company:} Stripe \\\\
\\textbf{Role:} Senior Software Engineer, Core Payments Infrastructure

\\vspace{10pt}
Dear Stripe Engineering Team,

I am writing to express my enthusiastic interest in the Senior Software Engineer position on Stripe's Core Payments Infrastructure team. Having architected fault-tolerant distributed ledger and settlement pipelines handling over 10 million transactions daily, I deeply admire Stripe's relentless standard for programmatic correctness, sub-millisecond latency, and world-class developer ergonomics.

In my recent role as Software Engineer at Acme Tech Corp, I spearheaded the re-architecture of our core transaction ingestion service from Python to Go and Kafka. Facing severe peak-hour bottlenecks during double-digit user growth, I designed a partitioned message consumer with concurrent Raft-based state machine replication. This initiative slashed end-to-end p99 processing latency by 35%, eliminated transaction drops to zero, and reduced compute overhead by \\$45,000 monthly. I bring this same rigor for engineering excellence, zero-downtime deployments, and empathetic mentorship to Stripe's payment rails.

What excites me most about Stripe is your mission to grow the GDP of the internet. As global commerce becomes increasingly real-time and decentralized, building idempotent, self-healing payment systems is paramount. I would welcome the opportunity to discuss how my distributed systems background and passion for foundational reliability can help accelerate Stripe's infrastructure roadmap.

Thank you for your time and thoughtful consideration.

\\vspace{14pt}
Sincerely, \\\\[12pt]
\\textbf{Jane Doe}

\\end{document}`
  },
  {
    id: 'template_academic_cv',
    title: 'Academic & Postdoc CV',
    category: 'resume',
    badge: 'Research & Publications',
    description: 'Designed for PhDs, researchers, and university posts. Focuses on peer-reviewed papers, grants, and teaching.',
    previewSnippet: '\\section{Publications} ... \\item Jane Doe, et al. "Novel Transformer Architectures", NeurIPS 2024.',
    fullLatex: `\\documentclass[letterpaper,10pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{enumitem}

\\titleformat{\\section}{\\large\\scshape\\raggedright}{}{0em}{}[\\titlerule]

\\begin{document}

\\begin{center}
    {\\Huge \\textbf{Dr. Jane Doe}} \\\\[4pt]
    Postdoctoral Research Fellow in Computer Science \\\\
    University of California, Berkeley $|$ \\href{mailto:jdoe@berkeley.edu}{jdoe@berkeley.edu} $|$ \\href{https://scholar.google.com}{Google Scholar}
\\end{center}

\\section{Research Interests}
Distributed Systems, Federated Machine Learning, Scalable Consensus Protocols, Formal Verification.

\\section{Education}
\\textbf{Ph.D. in Computer Science}, Stanford University \\hfill 2019 -- 2024 \\\\
\\textit{Dissertation: Byzantine Fault Tolerant State Replication in Heterogeneous Networks} \\\\
\\textbf{B.S. in Computer Engineering}, MIT, \\textit{Summa Cum Laude} \\hfill 2015 -- 2019

\\section{Selected Peer-Reviewed Publications}
\\begin{enumerate}[leftmargin=0.2in]
    \\item \\textbf{J. Doe}, A. Smith, and C. Taylor. "Sub-linear Byzantine Agreement in Asynchronous Networks." \\textit{Proceedings of SOSP 2023}.
    \\item \\textbf{J. Doe} and R. Miller. "Empirical Analysis of Decentralized Memory Fabrics." \\textit{ACM SIGCOMM 2022}.
\\end{enumerate}

\\section{Grants \\& Honors}
\\textbf{NSF Postdoctoral Research Fellowship} (\\$180,000) \\hfill 2024 -- 2026 \\\\
\\textbf{Best Paper Award}, ACM Symposium on Operating Systems Principles \\hfill 2023

\\section{Teaching \\& Mentorship}
\\textbf{Co-Instructor}, CS 162: Operating Systems (UC Berkeley, Fall 2024) \\\\
\\textbf{Graduate Teaching Assistant}, CS 244B: Distributed Systems (Stanford, 2021 -- 2023)

\\end{document}`
  }
];
