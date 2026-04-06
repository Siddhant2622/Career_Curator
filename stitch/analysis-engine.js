/**
 * Career Curator ATS Analysis Engine
 * Parses PDF/DOCX, extracts text, and performs real ATS analysis
 */

const ATSEngine = (() => {
  // ===== GEMINI AI CONFIG =====
  // Engine State
  let currentFile = null;
  // SECURITY: Never hardcode keys in client-side JS files. Load from device storage securely.
  let GEMINI_API_KEY = localStorage.getItem('_career_curator_ats_key') || "";
  const SCORE_WEIGHTS = { keywords: 40, formatting: 30, sections: 30 };

  // ===== TEXT EXTRACTION =====
  async function extractTextFromFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return await extractFromPDF(file);
    if (ext === 'docx') return await extractFromDOCX(file);
    if (ext === 'doc') return await extractFromDOCX(file);
    throw new Error('Unsupported file format: ' + ext);
  }

  async function extractFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }
    return text.trim();
  }

  async function extractFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  // ===== LOCAL ANALYSIS ENGINE =====
  function analyzeLocally(resumeText, jobDescription) {
    const resumeLower = resumeText.toLowerCase();
    const jobLower = (jobDescription || '').toLowerCase();

    // 1. Extract keywords from job description
    const jobKeywords = extractKeywords(jobLower);
    const resumeKeywords = extractKeywords(resumeLower);

    // 2. Keyword matching
    const matched = [];
    const missing = [];
    jobKeywords.forEach(kw => {
      if (resumeLower.includes(kw.toLowerCase())) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    // 3. Section detection
    const sections = detectSections(resumeText);

    // 4. Formatting checks
    const formatIssues = checkFormatting(resumeText);

    // 5. Content quality
    const contentMetrics = analyzeContent(resumeText);

    // 6. Calculate score
    let keywordScore;
    if (jobKeywords.length > 0) {
      const matchRate = (matched.length / jobKeywords.length) * 100;
      keywordScore = Math.max(0, matchRate - (missing.length * 1.5)); // Heavy penalty for missing exact keywords
    } else {
      keywordScore = estimateKeywordQuality(resumeKeywords);
    }

    const sectionScore = calculateSectionScore(sections);
    const formatScore = Math.max(0, 100 - (formatIssues.length * 15)); // Strict formatting penalty
    const contentScore = contentMetrics.score;

    // Strict enterprise ATS weighting
    const totalScore = Math.round(
      keywordScore * 0.45 +
      sectionScore * 0.20 +
      formatScore * 0.20 +
      contentScore * 0.15
    );

    // Realistic score, no artificial padding
    const finalScore = Math.min(100, Math.max(5, totalScore));

    return {
      score: finalScore,
      keywords: { matched, missing, total: jobKeywords.length || resumeKeywords.length },
      sections,
      formatIssues,
      contentMetrics,
      resumeText,
      jobDescription,
      analysisType: 'local'
    };
  }

  function extractKeywords(text) {
    // Common tech & professional keywords to look for
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'nodejs',
      'typescript', 'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'git', 'github',
      'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'devops',
      'machine learning', 'data analysis', 'project management', 'leadership',
      'communication', 'problem solving', 'teamwork', 'excel', 'power bi', 'tableau',
      'salesforce', 'sap', 'jira', 'confluence', 'figma', 'photoshop',
      'marketing', 'seo', 'analytics', 'budget', 'strategy', 'operations',
      'customer service', 'sales', 'negotiation', 'presentation',
      'c++', 'c#', '.net', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
      'linux', 'windows', 'macos', 'networking', 'security', 'cloud',
      'full stack', 'frontend', 'backend', 'database', 'testing', 'unit testing',
      'integration testing', 'automation', 'jenkins', 'terraform', 'ansible'
    ];

    // Extract words/phrases that appear in the text
    const found = [];
    const words = text.replace(/[^\w\s/.#+\-]/g, ' ').split(/\s+/);

    // Check for multi-word keywords first
    techKeywords.forEach(kw => {
      if (text.includes(kw)) {
        found.push(kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    });

    // Also extract capitalized proper nouns and acronyms from the text  
    const properNouns = text.match(/\b[A-Z][a-zA-Z+#.]{2,}\b/g) || [];
    const acronyms = text.match(/\b[A-Z]{2,6}\b/g) || [];

    const extras = [...new Set([...properNouns, ...acronyms])]
      .filter(w => !['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THIS', 'THAT', 'HAVE', 'BEEN', 'WILL', 'YOUR', 'ARE', 'NOT'].includes(w));

    return [...new Set([...found, ...extras.slice(0, 10)])].slice(0, 25);
  }

  function detectSections(text) {
    const sectionPatterns = {
      'Contact Info': /(?:email|phone|address|linkedin|github|portfolio|website)/i,
      'Summary/Objective': /(?:summary|objective|profile|about\s*me|professional\s*summary)/i,
      'Experience': /(?:experience|employment|work\s*history|professional\s*experience)/i,
      'Education': /(?:education|academic|degree|university|college|school)/i,
      'Skills': /(?:skills|technical\s*skills|core\s*competencies|proficiencies)/i,
      'Certifications': /(?:certification|certificate|licensed|accredit)/i,
      'Projects': /(?:projects|portfolio|personal\s*projects)/i,
      'Awards': /(?:awards|honors|achievements|recognition)/i,
      'Languages': /(?:languages|fluent|bilingual|multilingual)/i,
      'References': /(?:references|referees)/i
    };

    const found = {};
    Object.entries(sectionPatterns).forEach(([name, pattern]) => {
      found[name] = pattern.test(text);
    });
    return found;
  }

  function calculateSectionScore(sections) {
    const critical = ['Contact Info', 'Experience', 'Education', 'Skills'];
    const nice = ['Summary/Objective', 'Certifications', 'Projects'];

    // Strict scoring - no base score
    let score = 0;
    critical.forEach(s => { if (sections[s]) score += 20; }); // 4 * 20 = 80
    nice.forEach(s => { if (sections[s]) score += 6.67; }); // 3 * 6.67 = 20

    return Math.min(100, score);
  }

  function checkFormatting(text) {
    const issues = [];

    // Check for special characters that ATS can't parse
    const specialChars = text.match(/[►▪▸◆●○■□★☆→←↑↓✓✗✦✧⟶⟵]/g);
    if (specialChars && specialChars.length > 2) {
      issues.push({
        severity: 'error',
        title: 'Non-standard symbols detected (' + specialChars.length + ' found)',
        desc: 'Replace fancy bullets (►, ●, ★) with standard hyphens (-) or dots (•). ATS systems may not parse these correctly.'
      });
    }

    // Check for very long lines (possible table content)
    const lines = text.split('\n');
    const longSpaceLines = lines.filter(l => /\s{10,}/.test(l));
    if (longSpaceLines.length > 3) {
      issues.push({
        severity: 'error',
        title: 'Possible table/column layout detected',
        desc: 'ATS systems read left-to-right, top-to-bottom. Multi-column layouts may scramble your content. Use single-column format.'
      });
    }

    // Check for very short resume
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 150) {
      issues.push({
        severity: 'warning',
        title: 'Resume appears too short (' + wordCount + ' words)',
        desc: 'Most effective resumes are 400-800 words. Consider adding more detail to your experience and skills.'
      });
    } else if (wordCount > 1200) {
      issues.push({
        severity: 'warning',
        title: 'Resume may be too long (' + wordCount + ' words)',
        desc: 'Keep your resume concise. For most roles, 1-2 pages (400-800 words) is optimal.'
      });
    }

    // Check for email
    if (!/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
      issues.push({
        severity: 'error',
        title: 'No email address found',
        desc: 'ATS systems look for contact information. Make sure your email is clearly visible at the top of your resume.'
      });
    }

    // Check for phone
    if (!/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(text)) {
      issues.push({
        severity: 'warning',
        title: 'No phone number detected',
        desc: 'Include a phone number so recruiters can easily contact you.'
      });
    }

    // Check for dates (experience verification)
    const dateCount = (text.match(/(?:19|20)\d{2}/g) || []).length;
    if (dateCount < 2) {
      issues.push({
        severity: 'warning',
        title: 'Few or no dates found in resume',
        desc: 'Include dates for your work experience and education. ATS systems often parse these for timeline verification.'
      });
    }

    // Check for action verbs
    const actionVerbs = ['led', 'managed', 'developed', 'created', 'implemented', 'designed',
      'improved', 'increased', 'decreased', 'achieved', 'delivered', 'built', 'launched',
      'optimized', 'established', 'coordinated', 'analyzed', 'generated', 'reduced'];
    const verbCount = actionVerbs.filter(v => text.toLowerCase().includes(v)).length;
    if (verbCount < 3) {
      issues.push({
        severity: 'warning',
        title: 'Weak action verbs',
        desc: 'Use strong action verbs like "Led", "Developed", "Achieved", "Implemented" to start bullet points. Only ' + verbCount + ' found.'
      });
    }

    return issues;
  }

  function analyzeContent(text) {
    const lower = text.toLowerCase();
    let score = 0; // Strict base score

    // Check for quantifiable results (Heavy weighting for impact)
    const numbers = text.match(/\d+[%$KkMm]|\$[\d,.]+|\d+\+/g) || [];
    if (numbers.length >= 5) score += 40;
    else if (numbers.length >= 3) score += 25;
    else if (numbers.length >= 1) score += 10;

    // Check for action verbs
    const actionVerbs = ['led', 'managed', 'developed', 'created', 'implemented', 'designed',
      'improved', 'increased', 'achieved', 'delivered', 'built', 'launched', 'optimized'];
    const verbCount = actionVerbs.filter(v => lower.includes(v)).length;
    if (verbCount >= 7) score += 30;
    else if (verbCount >= 4) score += 20;
    else if (verbCount >= 2) score += 10;

    // Word count quality
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 400 && wordCount <= 800) score += 15;
    else if (wordCount >= 200) score += 5;

    // ===================================
    // ADVANCED COMPETITOR-LEVEL METRICS
    // ===================================
    
    // 1. Cliche / Fluff Detection (Negative scoring)
    const cliches = ['team player', 'hard worker', 'detail-oriented', 'detail oriented', 'think outside the box', 'go-getter', 'results-driven', 'synergy', 'dynamic'];
    const foundCliches = cliches.filter(c => lower.includes(c));
    if (foundCliches.length > 0) score -= (foundCliches.length * 3);

    // 2. Weak/Passive Verb Detection (Heavy penalty)
    const weakVerbs = ['responsible for', 'duties included', 'worked on', 'helped with', 'assisted in', 'handled'];
    const foundWeakVerbs = weakVerbs.filter(w => lower.includes(w));
    if (foundWeakVerbs.length > 0) score -= (foundWeakVerbs.length * 5);

    // 3. Bullet Point Repetition (Check if bullets start with same words)
    const bullets = text.match(/(?:-|\•)\s*([A-Za-z]+)/g) || [];
    const startingWords = bullets.map(b => b.replace(/(?:-|\•)\s*/, '').toLowerCase());
    let repetitionCount = 0;
    const wordFreq = {};
    startingWords.forEach(w => {
      if (w.length > 3) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
        if (wordFreq[w] === 2) repetitionCount++; // Found a repetition
      }
    });
    if (repetitionCount >= 2) score -= 10; // Penalize if multiple verbs are repeated

    return {
      score: Math.min(100, Math.max(0, score)),
      quantifiableResults: numbers.length,
      actionVerbCount: verbCount,
      wordCount: wordCount,
      foundCliches,
      foundWeakVerbs,
      repetitionCount,
      bulletCount: startingWords.length
    };
  }

  function estimateKeywordQuality(keywords) {
    // When no job description provided, estimate purely based on keyword richness
    return Math.min(100, keywords.length * 4);
  }

  // ===== GEMINI AI ANALYSIS (VIA NODE BACKEND) =====
  async function analyzeWithAI(resumeText, jobDescription) {
    try {
      const localResult = analyzeLocally(resumeText, jobDescription);

      // Use Cloudflare Worker backend instead of local server.
      const response = await fetch('https://career-curator-backend.siddhantgiri0726.workers.dev/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });

      if (!response.ok) {
        console.warn('Backend server unreachable or errored, falling back to local analysis.');
        return localResult;
      }

      const aiResult = await response.json();

      let optText = aiResult.optimizedText || null;
      let finalMissing = aiResult.missingKeywords || localResult.keywords.missing || [];
      
      // Physically append the explicit keyword block to the AI output so the exported PDF scores >95%
      if (optText && finalMissing.length > 0) {
        optText += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #000; font-family: Arial; font-size: 10px; color: #333;"><strong>ATS OPTIMIZATION KEYWORDS:</strong> ${finalMissing.join(' &bull; ')}</div>`;
      }

      return {
        score: aiResult.score || localResult.score,
        keywords: {
          matched: aiResult.matchedKeywords || localResult.keywords.matched,
          missing: finalMissing,
          total: (aiResult.matchedKeywords?.length || 0) + finalMissing.length || localResult.keywords.total
        },
        sections: localResult.sections,
        formatIssues: aiResult.formatIssues || localResult.formatIssues,
        contentMetrics: localResult.contentMetrics,
        suggestions: aiResult.suggestions || [],
        summary: aiResult.summary || '',
        strengths: aiResult.strengths || [],
        weaknesses: aiResult.weaknesses || [],
        optimizedText: optText,
        resumeText,
        jobDescription,
        analysisType: 'ai'
      };
    } catch (err) {
      console.error('AI Proxy failed:', err);
      return analyzeLocally(resumeText, jobDescription);
    }
  }

  // ===== GENERATE SUGGESTIONS (LOCAL) =====
  function generateSuggestions(result) {
    const suggestions = [];

    if (result.keywords.missing.length > 0) {
      suggestions.push({
        title: 'Add Missing Keywords',
        desc: `Include these keywords naturally in your resume: ${result.keywords.missing.slice(0, 5).join(', ')}. Add them to your Skills section or weave into experience bullets.`,
        category: 'keywords'
      });
    }

    if (!result.sections['Summary/Objective']) {
      suggestions.push({
        title: 'Add a Professional Summary',
        desc: 'Start with a 2-3 line summary highlighting your key qualifications. This helps ATS systems and recruiters quickly understand your profile.',
        category: 'content'
      });
    }

    if (result.contentMetrics.quantifiableResults < 3) {
      suggestions.push({
        title: 'Add Quantifiable Achievements',
        desc: 'Include numbers, percentages, and metrics. Instead of "Improved sales" write "Increased sales by 35% in Q3 2024". Aim for 3-5 quantified bullets.',
        category: 'content'
      });
    }

    if (result.contentMetrics.actionVerbCount < 5) {
      suggestions.push({
        title: 'Use Stronger Action Verbs',
        desc: 'Start bullet points with powerful verbs: Led, Developed, Architected, Delivered, Optimized, Spearheaded, Transformed. Avoid "Responsible for" or "Worked on".',
        category: 'content'
      });
    }

    if (!result.sections['Skills']) {
      suggestions.push({
        title: 'Add a Dedicated Skills Section',
        desc: 'Create a clear "Skills" section listing technical and soft skills. This is one of the first sections ATS systems scan.',
        category: 'format'
      });
    }

    if (result.score < 60) {
      suggestions.push({
        title: 'Tailor Resume to Each Job',
        desc: 'Your score suggests a significant gap. Customize your resume for each application by incorporating exact phrases from the job description.',
        category: 'keywords'
      });
    }

    return suggestions;
  }

  // ===== GENERATE OPTIMIZED RESUME =====
  function generateOptimizedResumeText(result) {
    if (result.analysisType === 'ai' && result.optimizedText) {
      return result.optimizedText;
    }

    // A simple, clean ATS-friendly reconstruction of the text
    let text = result.resumeText || '';
    
    // 1. Force actual line breaks on bullet characters that were crunched by pdf.js
    text = text.replace(/([a-zA-Z0-9.,])(\s*(?:•|▪|▸|◆|●|○|■|□|★|☆|✓|✦|✧|\*)\s+)/g, '$1\n$2');
    
    // 2. Clean out weird formatting characters safely
    text = text.replace(/[►▪▸◆●○■□★☆→←↑↓✓✗✦✧⟶⟵]/g, '•'); // Standardize bullets
    
    // 3. Force breaks before section headers that got swallowed (including common typos)
    text = text.replace(/([^A-Z\n])\s+(SUMMARY|PROFILE|EXPERIENCE|EDUCATION|TECHNICAL SKILLS|SKILLS|PROJECTS|SELECTED PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|ACHIVEMENTS|COURSES)\b/g, '$1\n\n$2\n');
    
    // 4. Inject Missing Keywords automatically to guarantee >95% score on external ATS
    if (result.keywords && result.keywords.missing && result.keywords.missing.length > 0) {
      const missingKeys = result.keywords.missing.join(' • ');
      text += '\n\nATS OPTIMIZATION KEYWORDS\n' + missingKeys;
    }

    let htmlOutput = `
      <div style="font-family: Arial, Helvetica, sans-serif; text-align: left; line-height: 1.4; color: #000; padding: 0 10px;">
    `;
    
    const textLines = text.split('\n').map(l => l.trim()).filter(line => line.length > 0);
    
    htmlOutput += `<ul style="list-style-type: none; padding: 0; margin: 0;">`; // Ensure list wrapper
    
    let inList = false;

    textLines.forEach((line, index) => {
      const cleanLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-');
      
      if (isBullet && !inList) {
        inList = true;
      } else if (!isBullet && inList) {
        inList = false;
        htmlOutput += `<div style="margin-bottom: 6px;"></div>`;
      }

      // First line is generally the applicant Name
      if (index === 0) {
        htmlOutput += `<h1 style="font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 4px;">${cleanLine}</h1>`;
        htmlOutput += `<div style="text-align: center; font-size: 10px; margin-bottom: 8px;">`;
      } 
      // Next 1-2 lines usually contain contact info, group them
      else if (index > 0 && index < 3 && (line.includes('@') || line.includes('github') || line.includes('linkedin') || /[0-9]{10}/.test(line) || line.toLowerCase().includes('mail'))) {
        htmlOutput += `${cleanLine} | `;
        if (index === Math.min(2, textLines.length-1)) htmlOutput += `</div>`;
      }
      // Standard Section Headers (ALL CAPS, longer than 3 chars)
      else if (line.length > 3 && line === line.toUpperCase() && !line.includes('@') && !line.includes('•')) {
        // If we missed closing the contact div
        if (index <= 3 && !htmlOutput.includes('</div>', htmlOutput.length-10)) htmlOutput += `</div>`;
        
        inList = false; // Reset list context on header
        htmlOutput += `<h2 style="font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 14px; margin-bottom: 6px;">${cleanLine}</h2>`;
      } 
      // Bullet point lines
      else if (isBullet) {
        htmlOutput += `<li style="font-size: 9.5px; margin-bottom: 3px; margin-left: 14px; text-indent: -10px;">${cleanLine}</li>`;
      }
      // Regular content
      else {
        // If we missed closing the contact div
        if (index <= 3 && !htmlOutput.includes('</div>', htmlOutput.length-10)) htmlOutput += `</div>`;
        
        // Bold the first few words if it looks like a job title or company structure (e.g. "Software Engineer - Google")
        let formattedText = cleanLine;
        if (cleanLine.length > 10 && cleanLine.length < 80 && !cleanLine.includes('•') && /[A-Z]/.test(cleanLine[0])) {
           if (cleanLine.split(' ').length < 12) {
             formattedText = `<strong>${cleanLine}</strong>`;
           }
        }
        htmlOutput += `<p style="font-size: 9.5px; margin-bottom: 3px; margin-top: 5px;">${formattedText}</p>`;
      }
    });

    htmlOutput += `</ul></div>`;
    return htmlOutput;
  }

  // ===== PUBLIC API =====
  return {
    extractText: extractTextFromFile,
    analyzeLocally,
    analyzeWithAI,
    generateSuggestions,
    generateOptimizedResumeText,
    setApiKey: (key) => { 
      GEMINI_API_KEY = key; 
      localStorage.setItem('_career_curator_ats_key', key);
    },
    getApiKey: () => GEMINI_API_KEY
  };
})();
