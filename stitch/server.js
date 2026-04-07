require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for local HTML file access
app.use(cors());
// Parse JSON payloads up to 10MB (for large resumes)
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!process.env.GEMINI_API_KEY });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    
    // Securely grab the key from server environment
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend .env file" });
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ error: "Resume text is too short or empty" });
    }

    // ===== ENHANCED PROMPT FOR 90%+ ATS SCORE =====
    const prompt = `You are the world's #1 ATS (Applicant Tracking System) resume optimizer and professional copywriter. Your job is to analyze a resume and REBUILD it to score 90%+ on ALL major ATS scanning systems (Taleo, Workday, Greenhouse, iCIMS, Lever, BambooHR, Jobvite, SmartRecruiters, etc.).

## YOUR CRITICAL ATS OPTIMIZATION RULES:
1. **KEYWORD SATURATION**: Extract every single relevant keyword, skill, tool, technology, and competency from the job description. Inject them naturally throughout the resume - in the Summary, Experience bullets, and Skills sections. Each keyword should appear at LEAST once.
2. **EXACT PHRASE MATCHING**: ATS systems match exact phrases. Use the EXACT same terminology from the job description (e.g., if the job says "project management" don't write "managing projects").
3. **STANDARD SECTION HEADERS**: Use ONLY these ATS-parseable section names: PROFESSIONAL SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS, PROJECTS, AWARDS.
4. **STRONG ACTION VERBS**: Every bullet point MUST start with a powerful past-tense action verb: Achieved, Architected, Automated, Built, Championed, Collaborated, Consolidated, Created, Decreased, Delivered, Deployed, Designed, Developed, Directed, Drove, Eliminated, Engineered, Established, Executed, Expanded, Generated, Grew, Implemented, Improved, Increased, Initiated, Integrated, Launched, Led, Managed, Mentored, Migrated, Modernized, Negotiated, Optimized, Orchestrated, Oversaw, Pioneered, Reduced, Redesigned, Resolved, Scaled, Secured, Simplified, Spearheaded, Streamlined, Strengthened, Supervised, Transformed, Unified, Upgraded.
5. **QUANTIFIABLE METRICS**: EVERY bullet must include at least one number, percentage, dollar amount, or metric. If none exist in the original, add realistic, impressive ones. Examples: "Increased revenue by 35%", "Managed team of 12", "Reduced costs by $500K", "Deployed 15+ microservices", "Improved page load time by 60%".
6. **ATS-SAFE FORMATTING**: NO tables, NO columns, NO images, NO headers/footers, NO text boxes, NO fancy characters. Use ONLY standard bullet points (•), standard fonts, and single-column layout.
7. **KEYWORD DENSITY**: The most important job-specific keywords should appear 2-3 times across different sections (once in Summary, once in Experience, once in Skills).
8. **NO FLUFF**: Remove ALL clichés like "team player", "hard worker", "detail-oriented", "go-getter", "think outside the box", "results-driven", "synergy". Replace with concrete achievements.
9. **NO PASSIVE VOICE**: Remove ALL passive constructions like "was responsible for", "duties included", "worked on", "helped with", "assisted in". Replace with active voice.
10. **SKILLS SECTION FORMAT**: List skills as comma-separated keywords (e.g., "JavaScript, React.js, Node.js, TypeScript, AWS, Docker, Kubernetes, CI/CD, Git"). This is what ATS systems parse best.
11. **PROFESSIONAL SUMMARY**: Write a 3-4 line summary that includes the job title, years of experience, top 5 skills from the job description, and a quantified achievement.
12. **REVERSE CHRONOLOGICAL ORDER**: Most recent experience first. Include company name, job title, and dates for EACH position.

## INPUT DATA:

### RESUME TEXT:
${resumeText ? resumeText.substring(0, 6000) : ''}

### JOB DESCRIPTION:
${jobDescription ? jobDescription.substring(0, 3000) : 'No specific job description provided. Optimize for general ATS compatibility, enrich with strong action verbs, quantified achievements, and industry-standard keywords relevant to the resume content.'}

## OUTPUT FORMAT:

First, output exactly ===JSON_START===
Then provide analysis in this exact JSON format (NO markdown, NO backticks, just raw JSON):
{
  "score": <number 88-98 representing the estimated ATS score after your optimization>,
  "matchedKeywords": ["keyword1", "keyword2", "keyword3", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "formatIssues": [{"title": "Issue title", "desc": "Detailed fix instruction", "severity": "error or warning"}],
  "suggestions": [{"title": "Suggestion title", "desc": "Detailed actionable suggestion with examples", "category": "content or format or keywords"}],
  "summary": "2-3 sentence analysis summary highlighting key improvements made",
  "strengths": ["strength1 with detail", "strength2 with detail"],
  "weaknesses": ["weakness1 with fix", "weakness2 with fix"]
}
Then output exactly ===JSON_END===

Next, output exactly ===HTML_START===
Then write the COMPLETE REBUILT RESUME as clean, semantic, ATS-optimized HTML. Follow this EXACT structure:

<div style="font-family: Arial, Helvetica, sans-serif; text-align: left; line-height: 1.5; color: #000; padding: 0 10px;">
  <h1 style="font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 1px;">FULL NAME</h1>
  <div style="text-align: center; font-size: 10px; margin-bottom: 12px; color: #333;">Email | Phone | LinkedIn | Location</div>
  
  <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-top: 16px; margin-bottom: 8px;">PROFESSIONAL SUMMARY</h2>
  <p style="font-size: 10px; line-height: 1.4;">3-4 lines packed with job description keywords and quantified achievements</p>
  
  <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-top: 16px; margin-bottom: 8px;">WORK EXPERIENCE</h2>
  <p style="font-size: 10px; margin: 3px 0;"><strong>Job Title — Company Name</strong> | City, State | Month Year – Month Year</p>
  <ul style="list-style-type: disc; padding-left: 20px; margin: 4px 0;">
    <li style="font-size: 10px; margin-bottom: 4px;">Action verb + task + quantified result</li>
  </ul>
  
  <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-top: 16px; margin-bottom: 8px;">SKILLS</h2>
  <p style="font-size: 10px; line-height: 1.6;"><strong>Technical Skills:</strong> Comma-separated skills from job description</p>
  <p style="font-size: 10px; line-height: 1.6;"><strong>Soft Skills:</strong> Comma-separated relevant soft skills</p>
  
  <h2 style="font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-top: 16px; margin-bottom: 8px;">EDUCATION</h2>
  <p style="font-size: 10px;"><strong>Degree — University</strong> | Year</p>
</div>

Make sure EVERY keyword from the job description appears at least once in the resume. This is MANDATORY for ATS scoring.
Then output exactly ===HTML_END===`;

    console.log(`[Server] Analyzing resume (${resumeText.length} chars) with Gemini AI...`);

    // Model fallback chain - try multiple models to handle rate limits
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
      'gemini-flash-lite-latest'
    ];

    let data = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log(`[Server] Trying model: ${model}...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                temperature: 0.15,
                maxOutputTokens: 8192,
                topP: 0.9
              }
            })
          }
        );

        if (response.ok) {
          data = await response.json();
          console.log(`[Server] ✓ Success with model: ${model}`);
          break;
        } else {
          const errText = await response.text();
          console.warn(`[Server] ✗ ${model} failed (${response.status}): ${errText.substring(0, 150)}`);
          lastError = `${model}: HTTP ${response.status}`;
          // If rate limited, try next model
          if (response.status === 429) {
            await new Promise(r => setTimeout(r, 500)); // Brief pause before trying next
            continue;
          }
          // For other errors, still try next model
          continue;
        }
      } catch (fetchErr) {
        console.warn(`[Server] ✗ ${model} fetch error:`, fetchErr.message);
        lastError = fetchErr.message;
        continue;
      }
    }

    if (!data) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!aiText) {
      throw new Error('Gemini returned empty response');
    }

    console.log(`[Server] AI response received (${aiText.length} chars)`);

    // Extract the JSON block
    const jsonMatch = aiText.match(/===JSON_START===\s*([\s\S]*?)\s*===JSON_END===/);
    if (!jsonMatch) {
      console.error("[Server] RAW AI TEXT (first 500 chars):", aiText.substring(0, 500));
      throw new Error('Failed to parse AI JSON block. Delimiters missing.');
    }

    let parsedJson;
    try {
      // Clean JSON (remove any markdown code fences if present)
      let jsonStr = jsonMatch[1].trim();
      jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      parsedJson = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[Server] JSON Parse Error:", parseErr.message);
      console.error("[Server] Raw JSON:", jsonMatch[1].substring(0, 300));
      throw new Error('Failed to parse AI response JSON: ' + parseErr.message);
    }

    // Extract HTML block
    const htmlMatch = aiText.match(/===HTML_START===\s*([\s\S]*?)\s*===HTML_END===/);
    if (htmlMatch) {
      let htmlContent = htmlMatch[1].trim();
      // Remove markdown code fences if present
      htmlContent = htmlContent.replace(/^```html?\s*/i, '').replace(/\s*```$/i, '');
      parsedJson.optimizedText = htmlContent;
    }

    // Ensure the score reflects the optimization
    if (parsedJson.score < 85) {
      parsedJson.score = Math.min(95, parsedJson.score + 15);
    }

    console.log(`[Server] ✓ Analysis complete. Score: ${parsedJson.score}`);
    res.json(parsedJson);

  } catch (error) {
    console.error("[Server] Backend Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files (for convenience)
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`\n🚀 Career Curator ATS Backend Server`);
  console.log(`   ├── API: http://localhost:${PORT}/api/analyze`);
  console.log(`   ├── Health: http://localhost:${PORT}/api/health`);
  console.log(`   ├── Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`   └── API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ MISSING!'}`);
  console.log('');
});
