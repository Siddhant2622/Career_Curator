require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so the local HTML file can talk to this server
app.use(cors());
// Parse JSON payloads up to 10MB (for large resumes)
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    
    // Securely grab the key from local server environment variables, NOT the website
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY in backend .env file" });
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer and elite copywriter. Analyze this resume against the job description.
Your ultimate goal is to rewrite the physical resume content so it achieves a >95% ATS match against the job description.
- Rewrite weak bullet points to use strong action verbs.
- Add quantifiable numbers where they naturally fit.
- Naturally integrate missing keywords into the Experience and Skills sections.
- Re-structure the layout logically (Summary, Experience, Skills, Education).

RESUME TEXT:
${resumeText ? resumeText.substring(0, 4000) : ''}

${jobDescription ? `JOB DESCRIPTION:\n${jobDescription.substring(0, 2000)}` : 'No job description provided - analyze general ATS compatibility and enrich the text.'}

First, output exactly ===JSON_START===
Then provide the analysis in this exact JSON format:
{
  "score": <number 0-100 estimating new optimized score>,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "formatIssues": [{"title": "Issue title", "desc": "How to fix it", "severity": "error or warning"}],
  "suggestions": [{"title": "Suggestion title", "desc": "Detailed suggestion", "category": "content/format/keywords"}],
  "summary": "Brief 2-sentence analysis summary",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}
Then output exactly ===JSON_END===

Next, output exactly ===HTML_START===
Then WRITE THE FULL REBUILT RESUME HERE AS CLEAN SEMANTIC HTML. Use <div style="font-family: Arial, sans-serif; text-align: left; padding: 10px; color: #000;"><h1 style="font-size: 18px; text-align: center; text-transform: uppercase;">Name</h1><div style="text-align: center; font-size: 10px; margin-bottom: 10px;">Email | Phone | Links</div>... and <h2 style="font-size: 11px; margin-top: 14px; border-bottom: 1px solid #000; text-transform: uppercase;"> for sections, and <li style="font-size: 9.5px; margin-bottom: 3px;"> for bullets.
Then output exactly ===HTML_END===`;

    // Perform the secure request from the server to Google
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google API responded with status ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract the JSON securely
    const jsonMatch = aiText.match(/===JSON_START===([\s\S]*?)===JSON_END===/);
    if (!jsonMatch) {
      console.error("RAW AI TEXT: ", aiText);
      throw new Error('Failed to parse AI JSON block. Delimiters missing.');
    }

    const parsedJson = JSON.parse(jsonMatch[1].trim());

    // Extract HTML securely
    const htmlMatch = aiText.match(/===HTML_START===([\s\S]*?)===HTML_END===/);
    if (htmlMatch) {
      parsedJson.optimizedText = htmlMatch[1].trim();
    }

    // Pass the payload directly back to the website exactly as it was
    res.json(parsedJson);

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Secure ATS Backend Server running on http://localhost:${PORT}`);
});
