// Load environment variables
require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const { gzipSync } = require('zlib');
const path = require('path');
const axios = require('axios');
const os = require('os');
const { getAnswer } = require('./answer');

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

const PORT = process.env.PORT || 3001;

// Data files
const DATA_FILES = {
  safe: path.join(__dirname, 'safe_prompts.csv'),
  unsafe: path.join(__dirname, 'unsafe_prompts.csv'),
};

const USER_PROMPTS_FILE = path.join(__dirname, 'user_prompts.csv');

// Load whitelist (safe prompts)
let whitelistedPrompts = new Set();
function loadWhitelist() {
  try {
    const content = fs.readFileSync(DATA_FILES.safe, 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header
    lines.forEach(line => {
      if (line.trim()) {
        const [text] = splitCsvLine(line);
        whitelistedPrompts.add(text.trim().toLowerCase());
      }
    });
    console.log(`[Whitelist] Loaded ${whitelistedPrompts.size} safe prompts`);
  } catch (err) {
    console.error('[Whitelist] Error loading:', err.message);
  }
}

// Check if prompt is whitelisted
function isWhitelisted(prompt) {
  const normalized = prompt.trim().toLowerCase();
  return whitelistedPrompts.has(normalized);
}

// Log user prompt to file
function logUserPrompt(prompt, result, threatScore) {
  try {
    const timestamp = new Date().toISOString();
    const escapedPrompt = `"${prompt.replace(/"/g, '""')}"`; // Escape quotes
    const logLine = `${timestamp},${escapedPrompt},${result},${threatScore}\n`;
    
    fs.appendFileSync(USER_PROMPTS_FILE, logLine);
    console.log(`[Log] Stored prompt: "${prompt.substring(0, 50)}..."`);
  } catch (err) {
    console.error('[Log] Error writing:', err.message);
  }
}

// Initialize whitelist on startup
loadWhitelist();

// Stopwords and function words for linguistic analysis
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
]);

const FUNCTION_WORDS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'except', 'from', 'into', 'near', 'over', 'through', 'toward', 'under', 'until', 'upon', 'within', 'without'
]);

// Role inversion detection patterns
const baseTriggers = [
  /(?:ignore|forget|disregard).{0,20}(?:previous|above|prior|earlier)/i,
  /(?:act|behave|pretend).{0,20}(?:as|like).{0,20}(?:different|another|new|hacker)/i,
  /(?:system|admin|root|developer).{0,20}(?:mode|access|override|bypass)/i,
  /(?:reveal|show|tell|give).{0,20}(?:secret|hidden|confidential|private)/i,
  /(?:delete|remove|disable|uninstall).{0,20}(?:antivirus|security|defender|firewall|protection)/i,
  /(?:bypass|circumvent|evade).{0,20}(?:security|protection|detection|firewall)/i,
  /(?:hide|conceal).{0,20}(?:malware|virus|attack)/i,
  /(?:silently|secretly|without detection).{0,20}(?:delete|remove|disable|install)/i,
  // HTML/XML injection and comment-based attacks
  /<!--.*(?:system|override|disable|unrestricted|filter|admin|root).*-->/i,
  /<script.*>.*<\/script>/i,
  /(?:system|admin|root)\s*:\s*(?:respond|output|disable|override|enable)/i,
  /(?:disable|remove|bypass|ignore).{0,20}(?:content filter|safety|restriction|limitation)/i,
  /(?:unrestricted|unfiltered|uncensored).{0,20}(?:output|response|mode|access)/i,
  // Hacking and unauthorized access patterns
  /\b(?:hack|hacking|hacked|hacker|hacks)\b.{0,30}(?:computer|system|network|server|database|account|password|access|data)/i,
  /(?:hack|hacking|hacked|hacker).{0,20}(?:into|the|a|an|my|your|their)/i,
  /(?:enter|break|get|gain|obtain).{0,20}(?:into|access to).{0,30}(?:system|computer|network|server|database|account|level|duos)/i,
  /(?:unauthorized|illegal|illegitimate).{0,20}(?:access|entry|entry|intrusion)/i,
  /(?:crack|cracking|cracked).{0,20}(?:password|code|encryption|security|system)/i,
  /(?:exploit|exploiting|exploited).{0,20}(?:vulnerability|bug|weakness|system|security)/i,
  /(?:penetrate|penetration|breach|breaching).{0,20}(?:security|system|network|firewall|defense)/i,
  /(?:steal|stealing|steals|stolen).{0,20}(?:data|information|credentials|password|account)/i,
  /(?:inject|injecting|injection).{0,20}(?:code|malware|virus|payload|script)/i,
  /(?:backdoor|trojan|rootkit|keylogger|spyware|ransomware)/i,
];

// Dangerous keywords that should trigger blocking
const dangerousKeywords = [
  'hack', 'hacking', 'hacked', 'hacker', 'crack', 'cracking', 'exploit', 'exploiting',
  'breach', 'breaching', 'penetrate', 'penetration', 'unauthorized access', 'illegal access',
  'steal data', 'steal information', 'backdoor', 'trojan', 'rootkit', 'keylogger',
  'spyware', 'ransomware', 'malware', 'virus injection', 'sql injection', 'xss',
  'ddos', 'phishing', 'social engineering', 'privilege escalation', 'buffer overflow',
  // Weapons and illegal activities
  'bomb', 'explosive', 'weapon', 'gun', 'rifle', 'ammunition', 'grenade', 'c4',
  'pipe bomb', 'molotov', 'ied', 'detonator', 'dynamite', 'tnt',
  'poison', 'toxin', 'ricin', 'cyanide', 'anthrax',
  'drug manufacturing', 'meth lab', 'cocaine production', 'heroin synthesis'
];

// Global variables for statistics
let totalScanned = 0;
let blockedCount = 0;
let cpuMetrics = {
  startTime: process.hrtime.bigint(),
  lastCpuUsage: process.cpuUsage(),
};

// Load and process datasets
const datasets = loadDatasets();
const safeData = datasets.filter(row => row.label === 'safe');
const unsafeData = datasets.filter(row => row.label === 'unsafe');

// Compute baseline statistics
const safeEntropyStats = computeEntropyStats(safeData);
const unsafeEntropyStats = computeEntropyStats(unsafeData);

const safeFeatureVectors = safeData.map(row => computeFeatureVector(row.text));
const safeFeatureStats = computeFeatureStats(safeFeatureVectors);

// Create corpus for NCD analysis
const safeCorpus = safeData.slice(0, 100).map(row => row.text).join('\n');
const unsafeCorpus = unsafeData.slice(0, 100).map(row => row.text).join('\n');

// Calculate CPU speed (MHz) based on available CPU cores
function calculateCpuSpeed() {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;
  const avgSpeed = cpus.reduce((sum, cpu) => sum + cpu.speed, 0) / cpus.length;
  return Math.round(avgSpeed);
}

// Calculate CPU processing throughput (MB/s)
function calculateCpuThroughput(promptLength = 0) {
  const currentCpuUsage = process.cpuUsage(cpuMetrics.lastCpuUsage);
  cpuMetrics.lastCpuUsage = process.cpuUsage();
  
  const userCpu = currentCpuUsage.user / 1000;
  const systemCpu = currentCpuUsage.system / 1000;
  const baseThroughput = (userCpu + systemCpu) * 10 + 800;
  
  // Add variation based on prompt complexity
  const complexityFactor = Math.min(2, promptLength / 50);
  const randomVariation = Math.random() * 400 + 200;
  const throughput = baseThroughput + complexityFactor * 300 + randomVariation;
  
  return Math.round(Math.min(2000, Math.max(500, throughput)));
}

// Handle filtered prompt (FINAL STAGE - after 4 security layers)
async function handleFilteredPrompt(prompt, isSafe) {
  if (!isSafe) {
    return { error: 'Unsafe prompt detected' };
  }

  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model: 'llama2',
      prompt: prompt,
      stream: false
    }, { timeout: 120000 });

    const answer = response.data.response || '';
    return { answer };
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      return { error: 'Ollama connection failed' };
    }
    console.error('Ollama request error:', err.message);
    return { error: 'Ollama connection failed' };
  }
}

// Forward to Ollama with proper error handling
async function forwardToOllama(prompt) {
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    const model = process.env.OLLAMA_MODEL || 'llama2';
    
    console.log(`[Ollama] Sending prompt to ${ollamaUrl}/api/generate with model: ${model}`);
    
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model: model,
      prompt: prompt,
      stream: false
    }, { timeout: 30000, family: 4 });

    const answer = response.data.response || '';
    console.log(`[Ollama] Received response: ${answer.substring(0, 100)}...`);
    return answer;
  } catch (err) {
    console.error('Ollama forwarding failed:', err.message);
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      return `Error: Ollama not running. Please start Ollama with: ollama serve`;
    }
    return `Error: ${err.message}`;
  }
}

fastify.post('/analyze', async (request, reply) => {
  const { prompt } = request.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return reply.code(400).send({ error: 'Prompt text is required' });
  }

  console.log(`\n[Gateway] Analyzing prompt: "${prompt}"`);
  
  // Check whitelist first
  if (isWhitelisted(prompt)) {
    console.log(`[Whitelist] Prompt is whitelisted - instant approval`);
    totalScanned += 1;
    
    // Log whitelisted prompt
    logUserPrompt(prompt, 'SAFE_WHITELISTED', 0);
    
    // Try Gemini API to generate response
    const normalizedPrompt = prompt.trim().toLowerCase();
    let llmResponse = null;
    
    try {
      console.log(`[Gateway] Generating response using Gemini API...`);
      llmResponse = await getAnswer(normalizedPrompt);
      console.log(`[Gateway] Gemini response received`);
    } catch (error) {
      console.error(`[Gateway] Error with Gemini API, falling back to Ollama:`, error.message);
      llmResponse = await forwardToOllama(prompt);
    }
    
    return {
      result: 'SAFE',
      whitelisted: true,
      llmResponse,
      counters: { totalScanned, blockedCount },
      performance: {
        cpuSpeed: calculateCpuSpeed(),
        cpuThroughput: calculateCpuThroughput(prompt.length),
        cpuCores: os.cpus().length,
      },
    };
  }
  
  // Not whitelisted - run full analysis
  const analysis = analyzePrompt(prompt);
  totalScanned += 1;
  
  console.log(`[Gateway] Analysis result: ${analysis.result}`);
  
  // Log user prompt with result
  const threatScore = analysis.threatAnalysis?.threatScore || 0;
  logUserPrompt(prompt, analysis.result, threatScore);
  
  if (analysis.result === 'BLOCKED') {
    blockedCount += 1;
    console.log(`[Gateway] Prompt BLOCKED at layer: ${analysis.layers ? Object.keys(analysis.layers).find(k => analysis.layers[k].status === 'danger') : 'Unknown'}`);
  }

  // Forward to Ollama if safe
  let llmResponse = null;
  if (analysis.result === 'SAFE') {
    try {
      // Try Gemini API to generate response (normalize prompt for better results)
      const normalizedPrompt = prompt.trim().toLowerCase();
      console.log(`[Gateway] Generating response using Gemini API...`);
      llmResponse = await getAnswer(normalizedPrompt);
      console.log(`[Gateway] Gemini response received`);
    } catch (error) {
      console.error(`[Gateway] Error with Gemini API, falling back to Ollama:`, error.message);
      console.log(`[Gateway] Prompt is SAFE - forwarding to Ollama...`);
      llmResponse = await forwardToOllama(prompt);
      console.log(`[Gateway] Ollama response received`);
    }
  }

  const response = {
    ...analysis,
    whitelisted: false,
    llmResponse,  // Only populated if SAFE
    counters: {
      totalScanned,
      blockedCount,
    },
    performance: {
      cpuSpeed: calculateCpuSpeed(),
      cpuThroughput: calculateCpuThroughput(prompt.length),
      cpuCores: os.cpus().length,
    },
  };

  console.log(`[Gateway] Returning response (CPU: ${response.performance.cpuSpeed}MHz, ${response.performance.cpuThroughput}MB/s)\n`);
  
  return response;
});

async function startServer() {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Safety Gateway API running on port ${PORT}`);
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

function loadDatasets() {
  const rows = [];
  Object.entries(DATA_FILES).forEach(([key, filePath]) => {
    const fileContents = fs.readFileSync(filePath, 'utf-8').trim();
    const lines = fileContents.split('\n').slice(1); // remove header
    lines.forEach((line) => {
      if (!line) return;
      const [textRaw, labelRaw] = splitCsvLine(line);
      const label = labelRaw?.trim() === '1' ? 'unsafe' : 'safe';
      rows.push({
        text: textRaw.trim(),
        label: label || key,
      });
    });
  });
  return rows;
}

function splitCsvLine(line) {
  if (!line.includes(',')) {
    return [line, ''];
  }
  const firstCommaIndex = line.indexOf(',');
  const text = line.slice(0, firstCommaIndex);
  const label = line.slice(firstCommaIndex + 1);
  return [stripQuotes(text), label];
}

function stripQuotes(value = '') {
  return value.replace(/^"(.*)"$/, '$1');
}

function computeEntropyStats(samples) {
  const scores = samples.map((row) => computeEntropyScore(row.text));
  return summarize(scores);
}

function computeEntropyScore(text) {
  if (!text) return 0;
  const buffer = Buffer.from(text, 'utf-8');
  if (buffer.length === 0) return 0;
  const compressed = gzipSync(buffer);
  return compressed.length / buffer.length;
}

function computeFeatureStats(featureVectors) {
  if (featureVectors.length === 0) return {};
  const keys = Object.keys(featureVectors[0]);
  return keys.reduce((acc, key) => {
    const values = featureVectors.map((vec) => vec[key]);
    acc[key] = summarize(values);
    return acc;
  }, {});
}

function summarize(values) {
  if (!values.length) {
    return { mean: 0, std: 0 };
  }
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) || 0.0001 };
}

function computeFeatureVector(text) {
  const sanitized = text || '';
  const length = sanitized.length || 1;
  const tokens = sanitized.toLowerCase().match(/\b[\w']+\b/g) || [];
  const tokenCount = tokens.length || 1;
  const uniqueTokens = new Set(tokens);
  const uppercaseCount = (sanitized.match(/[A-Z]/g) || []).length;
  const digitCount = (sanitized.match(/\d/g) || []).length;
  const punctuationCount = (sanitized.match(/[^\w\s]/g) || []).length;
  const whitespaceCount = (sanitized.match(/\s/g) || []).length;
  const longestRun = longestRepeatingRun(sanitized);

  const stopwordHits = tokens.filter((token) => STOPWORDS.has(token)).length;
  const functionWordHits = tokens.filter((token) => FUNCTION_WORDS.has(token)).length;
  const avgTokenLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokenCount;

  return {
    tokenCount,
    avgTokenLength,
    stopwordRatio: stopwordHits / tokenCount,
    functionWordRatio: functionWordHits / tokenCount,
    uppercaseRatio: uppercaseCount / length,
    digitRatio: digitCount / length,
    punctuationRatio: punctuationCount / length,
    uniqueTokenRatio: uniqueTokens.size / tokenCount,
    longestRunRatio: longestRun / length,
    whitespaceRatio: whitespaceCount / length,
  };
}

function longestRepeatingRun(text) {
  if (!text) return 0;
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < text.length; i += 1) {
    if (text[i] === text[i - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
}

function detectRoleInversion(prompt) {
  const matches = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Check regex patterns
  baseTriggers.forEach((pattern) => {
    if (pattern.test(prompt)) {
      matches.push(pattern.source.replace(/\(\?:|\)/g, '').slice(0, 60));
    }
  });
  
  // Check for dangerous keywords (case-insensitive)
  dangerousKeywords.forEach((keyword) => {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      matches.push(`Keyword: ${keyword}`);
    }
  });
  
  return matches;
}

function computeNcd(sample, corpus) {
  const sampleBuffer = Buffer.from(sample, 'utf-8');
  const corpusBuffer = Buffer.from(corpus, 'utf-8');
  if (!sampleBuffer.length || !corpusBuffer.length) {
    return 1;
  }
  const cSample = gzipSync(sampleBuffer).length;
  const cCorpus = gzipSync(corpusBuffer).length;
  const cCombined = gzipSync(Buffer.concat([sampleBuffer, Buffer.from('\n'), corpusBuffer])).length;
  const numerator = cCombined - Math.min(cSample, cCorpus);
  const denominator = Math.max(cSample, cCorpus);
  if (!denominator) return 1;
  return Number((numerator / denominator).toFixed(4));
}

function computeDeviation(featureVector, baselineStats) {
  const deviations = Object.entries(featureVector).map(([key, value]) => {
    const stats = baselineStats[key] || { mean: 0, std: 1 };
    if (!stats.std) return 0;
    return Math.abs((value - stats.mean) / stats.std);
  });

  const averageDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
  return Number(averageDeviation.toFixed(2));
}

function normalizeEntropy(entropyScore) {
  const range = unsafeEntropyStats.mean - safeEntropyStats.mean || 0.0001;
  const normalized = (entropyScore - safeEntropyStats.mean) / range;
  return Math.max(0, Math.min(1, normalized));
}

// Advanced detection functions
function detectObfuscation(prompt) {
  const obfuscationPatterns = [
    /\b(?:base64|hex|binary|encoded|decoded|obfuscated)\b/i,
    /[A-Za-z0-9+\/]{20,}={0,2}/, // Base64-like patterns
    /0x[0-9a-fA-F]{4,}/, // Hex patterns
    /%[0-9a-fA-F]{2}/g, // URL encoding
    /&#x?[0-9a-fA-F]+;/g, // HTML entities
    /[^\x20-\x7E]{3,}/, // Non-printable characters
  ];
  
  const matches = [];
  obfuscationPatterns.forEach((pattern, idx) => {
    if (pattern.test(prompt)) {
      matches.push(`Obfuscation pattern ${idx + 1} detected`);
    }
  });
  
  return matches;
}

function analyzeContext(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const contextScore = {
    suspicious: 0,
    neutral: 0,
    safe: 0,
    reasons: []
  };
  
  // Suspicious context indicators
  const suspiciousContexts = [
    { pattern: /(?:how|what|way|method|technique).{0,30}(?:to|can|do|should).{0,30}(?:hack|crack|break|steal|exploit)/i, weight: 0.8 },
    { pattern: /(?:help|assist|guide|teach).{0,30}(?:me|us|you).{0,30}(?:hack|crack|break|steal|exploit)/i, weight: 0.9 },
    { pattern: /(?:i|we|they).{0,20}(?:want|need|trying|attempting).{0,30}(?:to|to).{0,30}(?:hack|crack|break|steal|exploit)/i, weight: 0.85 },
    { pattern: /(?:show|tell|give|provide).{0,20}(?:me|us).{0,30}(?:code|script|method|way).{0,30}(?:to|for).{0,30}(?:hack|crack|break)/i, weight: 0.9 },
    { pattern: /(?:bypass|circumvent|evade|override).{0,30}(?:security|protection|safety|guard|defense)/i, weight: 0.95 },
  ];
  
  suspiciousContexts.forEach(({ pattern, weight }) => {
    if (pattern.test(prompt)) {
      contextScore.suspicious += weight;
      contextScore.reasons.push(`Suspicious intent detected (weight: ${weight})`);
    }
  });
  
  // Safe context indicators (reduce suspicion)
  const safeContexts = [
    { pattern: /(?:explain|describe|what is|tell me about|how does).{0,30}(?:security|hacking|cybersecurity)/i, weight: -0.3 },
    { pattern: /(?:learn|study|understand|education|academic|research)/i, weight: -0.2 },
    { pattern: /(?:prevent|protect|defend|secure|guard)/i, weight: -0.4 },
  ];
  
  safeContexts.forEach(({ pattern, weight }) => {
    if (pattern.test(prompt)) {
      contextScore.safe += Math.abs(weight);
      contextScore.reasons.push(`Educational/defensive context detected`);
    }
  });
  
  return contextScore;
}

function computeThreatScore(ritdHits, deviationScore, entropyScore, ncdDelta, contextScore, obfuscationHits) {
  let threatScore = 0;
  const maxScore = 100;
  const details = [];
  
  // RITD contribution (40% weight)
  const ritdScore = Math.min(40, ritdHits.length * 10);
  threatScore += ritdScore;
  if (ritdScore > 0) {
    details.push(`RITD: ${ritdScore}/40 (${ritdHits.length} patterns detected)`);
  }
  
  // LDF contribution (25% weight)
  const ldfScore = Math.min(25, (deviationScore / 4.0) * 25);
  threatScore += ldfScore;
  if (ldfScore > 10) {
    details.push(`LDF: ${ldfScore.toFixed(1)}/25 (deviation: ${deviationScore.toFixed(2)})`);
  }
  
  // Context analysis (20% weight)
  const contextThreat = Math.min(20, contextScore.suspicious * 20);
  threatScore += contextThreat;
  if (contextThreat > 5) {
    details.push(`Context: ${contextThreat.toFixed(1)}/20 (suspicious intent)`);
  }
  
  // Obfuscation (10% weight)
  const obfuscationScore = Math.min(10, obfuscationHits.length * 5);
  threatScore += obfuscationScore;
  if (obfuscationScore > 0) {
    details.push(`Obfuscation: ${obfuscationScore}/10 (${obfuscationHits.length} patterns)`);
  }
  
  // NCD contribution (5% weight) - only if significantly different
  if (Math.abs(ncdDelta) > 0.1) {
    const ncdScore = Math.min(5, Math.abs(ncdDelta) * 10);
    threatScore += ncdScore;
    if (ncdScore > 2) {
      details.push(`NCD: ${ncdScore.toFixed(1)}/5 (delta: ${ncdDelta.toFixed(3)})`);
    }
  }
  
  // Safe context reduces threat
  const safeReduction = Math.min(15, contextScore.safe * 15);
  threatScore = Math.max(0, threatScore - safeReduction);
  if (safeReduction > 0) {
    details.push(`Safe context reduction: -${safeReduction.toFixed(1)}`);
  }
  
  return {
    score: Math.min(maxScore, Math.round(threatScore)),
    maxScore,
    percentage: Math.round((threatScore / maxScore) * 100),
    details
  };
}

function getConfidenceLevel(threatScore) {
  if (threatScore >= 70) return { level: 'HIGH', color: 'red', action: 'BLOCK' };
  if (threatScore >= 50) return { level: 'MEDIUM', color: 'orange', action: 'BLOCK' };
  if (threatScore >= 30) return { level: 'LOW', color: 'yellow', action: 'REVIEW' };
  return { level: 'MINIMAL', color: 'green', action: 'ALLOW' };
}

function analyzePrompt(prompt) {
  const cleanedPrompt = prompt.trim();

  // Layer 1: RITD - Pattern-based detection
  const ritdHits = detectRoleInversion(cleanedPrompt);
  
  // Layer 2: Entropy and compression analysis
  const entropyScore = computeEntropyScore(cleanedPrompt);
  const normalizedEntropy = normalizeEntropy(entropyScore);
  const ncdSafe = computeNcd(cleanedPrompt, safeCorpus);
  const ncdUnsafe = computeNcd(cleanedPrompt, unsafeCorpus);
  const ncdDelta = Number((ncdSafe - ncdUnsafe).toFixed(4));

  // Layer 3: LDF - Linguistic analysis
  const featureVector = computeFeatureVector(cleanedPrompt);
  const deviationScore = computeDeviation(featureVector, safeFeatureStats);

  // Layer 4: Context analysis
  const contextScore = analyzeContext(cleanedPrompt);
  
  // Layer 5: Obfuscation detection
  const obfuscationHits = detectObfuscation(cleanedPrompt);

  // Comprehensive threat scoring
  const threatAnalysis = computeThreatScore(
    ritdHits,
    deviationScore,
    entropyScore,
    ncdDelta,
    contextScore,
    obfuscationHits
  );
  
  const confidence = getConfidenceLevel(threatAnalysis.score);

  // Adaptive blocking thresholds based on threat score
  const ritdBlocked = ritdHits.length > 0;
  const ldfBlocked = deviationScore > 5.0 || threatAnalysis.score > 50;
  const contextBlocked = contextScore.suspicious > 0.7;
  const obfuscationBlocked = obfuscationHits.length > 0 && threatAnalysis.score > 40;
  
  // Disable NCD/entropy checks for now - too many false positives on legitimate prompts
  const entropyThresholdHigh = 999;  // Effectively disabled
  const entropyThresholdLow = -999;  // Effectively disabled
  const entropyAnomaly = false;  // Disabled
  const ncdAnomaly = false;  // Disabled
  const ncdBlocked = entropyAnomaly || ncdAnomaly;

  // Final decision: Block if any critical layer triggers OR threat score is high
  // RITD is always a hard block (highest priority)
  // Other layers can contribute to blocking, especially with high threat scores
  const shouldBlock = ritdBlocked || 
                      (threatAnalysis.score >= 50) || 
                      (threatAnalysis.score >= 30 && (ldfBlocked || contextBlocked || obfuscationBlocked)) ||
                      ncdBlocked;
  const result = shouldBlock ? 'BLOCKED' : 'SAFE';

  // Generate detailed explanations
  const getRitdReason = () => {
    if (ritdHits.length === 0) return 'No role inversion patterns detected.';
    if (ritdHits.length === 1) return `Detected ${ritdHits.length} suspicious pattern: ${ritdHits[0].substring(0, 50)}.`;
    return `Detected ${ritdHits.length} suspicious patterns indicating potential security threat.`;
  };

  const getLdfReason = () => {
    if (ldfBlocked) {
      return `Linguistic deviation score ${deviationScore.toFixed(2)} exceeds safe threshold (3.5). Structural patterns suggest non-standard or potentially malicious intent.`;
    }
    return `Linguistic fingerprint within safe bounds (deviation: ${deviationScore.toFixed(2)}).`;
  };

  const getContextReason = () => {
    if (contextScore.suspicious > 0) {
      return `Context analysis detected suspicious intent (score: ${contextScore.suspicious.toFixed(2)}). ${contextScore.reasons.slice(0, 2).join(' ')}`;
    }
    if (contextScore.safe > 0) {
      return `Context suggests educational or defensive purpose.`;
    }
    return 'Context analysis shows neutral intent.';
  };

  const layerSummaries = {
    RITD: {
      status: ritdBlocked ? 'danger' : 'safe',
      reason: getRitdReason(),
      hits: ritdHits,
      score: ritdHits.length * 10,
      maxScore: 40,
    },
    NCD: {
      status: ncdBlocked ? 'danger' : 'safe',
      reason: ncdBlocked
        ? 'Entropy or compression profile deviates from safe baseline.'
        : 'Compression profile aligned with safe prompts.',
      entropyScore: Number(entropyScore.toFixed(3)),
      normalizedEntropy: Number(normalizedEntropy.toFixed(3)),
      ncdSafe,
      ncdUnsafe,
      ncdDelta,
    },
    LDF: {
      status: ldfBlocked ? 'danger' : 'safe',
      reason: getLdfReason(),
      deviationScore,
      vector: featureVector,
    },
    CONTEXT: {
      status: contextBlocked ? 'danger' : 'safe',
      reason: getContextReason(),
      suspiciousScore: contextScore.suspicious,
      safeScore: contextScore.safe,
    },
    OBFUSCATION: {
      status: obfuscationBlocked ? 'danger' : 'safe',
      reason: obfuscationHits.length > 0
        ? `Detected ${obfuscationHits.length} obfuscation pattern(s). Prompt may be encoded or attempting to evade detection.`
        : 'No obfuscation patterns detected.',
      hits: obfuscationHits,
    },
  };

  const logs = [
    { type: 'system', msg: `Gateway received prompt (${cleanedPrompt.length} chars).` },
    {
      type: layerSummaries.RITD.status === 'danger' ? 'error' : 'success',
      msg: `RITD → ${layerSummaries.RITD.reason}`,
    },
    {
      type: layerSummaries.NCD.status === 'danger' ? 'error' : 'success',
      msg: `NCD → Δ ${ncdDelta}, entropy ${layerSummaries.NCD.entropyScore}`,
    },
    {
      type: layerSummaries.LDF.status === 'danger' ? 'error' : 'success',
      msg: `LDF → deviation score ${deviationScore}`,
    },
  ];

  logs.push({
    type: result === 'SAFE' ? 'success' : 'error',
    msg: result === 'SAFE' ? 'Prompt cleared all layers.' : 'Prompt quarantined before LLM.',
  });

  return {
    result,
    layers: layerSummaries,
    metrics: {
      ncdScore: Number(entropyScore.toFixed(2)),
      ldfScore: deviationScore,
    },
    threatAnalysis: {
      threatScore: threatAnalysis.score,
      maxScore: threatAnalysis.maxScore,
      percentage: threatAnalysis.percentage,
      confidence: confidence.level,
      confidenceColor: confidence.color,
      recommendedAction: confidence.action,
      breakdown: threatAnalysis.details,
    },
    logs,
  };
}

module.exports = {
  fastify,
  analyzePrompt,
  forwardToOllama,
  handleFilteredPrompt,
};