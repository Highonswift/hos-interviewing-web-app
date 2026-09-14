import { CodingLanguage, LANGUAGE_META, Judge0Response, TestCaseResult, ExecuteRequest, ExecuteResponse } from './types';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const RAPIDAPI_KEY   = process.env.RAPIDAPI_KEY ?? '';

const EXECUTION_TIMEOUT_MS = 15_000;
const JUDGE0_ACCEPTED = 3;

const MAX_OUTPUT_LENGTH = 4_000;

function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .trim();
}

function truncate(str: string, max = MAX_OUTPUT_LENGTH): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `\n…[truncated, ${str.length - max} chars omitted]`;
}

async function runSingleTestCase(
  language:       CodingLanguage,
  code:           string,
  testCaseId:     string,
  input:          string,
  expectedOutput: string,
  isPublic:       boolean,
): Promise<TestCaseResult> {
  const meta      = LANGUAGE_META[language];
  const startTime = Date.now();

  if (!RAPIDAPI_KEY) {
    return {
      test_case_id:    testCaseId,
      input,
      expected_output: expectedOutput,
      actual_output:   '',
      passed:          false,
      error:           'RAPIDAPI_KEY is not set. Add it to your .env.local file.',
      time_ms:         0,
      is_public:       isPublic,
    };
  }

  const body = {
    language_id:     meta.judge0Id,
    source_code:     code,
    stdin:           input,
    cpu_time_limit:  5,
    memory_limit:    131072,
    wall_time_limit: 10,
  };

  let judge0Res: Judge0Response;

  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const res = await fetch(
      `${JUDGE0_API_URL}?base64_encoded=false&wait=true`,
      {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-RapidAPI-Key':    RAPIDAPI_KEY,
          'X-RapidAPI-Host':   'judge0-ce.p.rapidapi.com',
        },
        body:   JSON.stringify(body),
        signal: controller.signal,
      },
    );

    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Judge0 API error ${res.status}: ${text}`);
    }

    judge0Res = await res.json() as Judge0Response;

  } catch (err: unknown) {
    const msg       = err instanceof Error ? err.message : 'Unknown execution error';
    const isTimeout = msg.includes('abort') || msg.toLowerCase().includes('timeout');

    return {
      test_case_id:    testCaseId,
      input,
      expected_output: expectedOutput,
      actual_output:   '',
      passed:          false,
      error:           isTimeout ? 'Time limit exceeded' : msg,
      time_ms:         Date.now() - startTime,
      is_public:       isPublic,
    };
  }

  const elapsed = Date.now() - startTime;
  const statusId = judge0Res.status?.id ?? -1;

  if (statusId === 5) {
    return {
      test_case_id:    testCaseId,
      input,
      expected_output: expectedOutput,
      actual_output:   '',
      passed:          false,
      error:           'Time limit exceeded',
      time_ms:         elapsed,
      is_public:       isPublic,
    };
  }

  if (statusId === 6) {
    return {
      test_case_id:    testCaseId,
      input,
      expected_output: expectedOutput,
      actual_output:   '',
      passed:          false,
      error:           truncate(judge0Res.compile_output ?? 'Compilation error'),
      time_ms:         elapsed,
      is_public:       isPublic,
    };
  }

  const isRuntimeError = statusId >= 7 && statusId <= 12;
  if (isRuntimeError) {
    const errMsg = judge0Res.stderr || judge0Res.message || `Runtime error (status ${statusId})`;
    return {
      test_case_id:    testCaseId,
      input,
      expected_output: expectedOutput,
      actual_output:   '',
      passed:          false,
      error:           truncate(errMsg),
      time_ms:         elapsed,
      is_public:       isPublic,
    };
  }

  const rawOutput  = judge0Res.stdout ?? '';
  const actualNorm = normalizeOutput(rawOutput);
  const expectNorm = normalizeOutput(expectedOutput);
  const passed     = statusId === JUDGE0_ACCEPTED && actualNorm === expectNorm;

  const hasStderr  = (judge0Res.stderr ?? '').trim().length > 0;
  const errorMsg   = !passed && hasStderr
    ? truncate(judge0Res.stderr!)
    : null;

  const judgeTimeMs = judge0Res.time
    ? Math.round(parseFloat(judge0Res.time) * 1000)
    : elapsed;

  return {
    test_case_id:    testCaseId,
    input,
    expected_output: expectedOutput,
    actual_output:   truncate(rawOutput),
    passed,
    error:           errorMsg,
    time_ms:         judgeTimeMs,
    is_public:       isPublic,
  };
}

export async function runCode(req: ExecuteRequest): Promise<ExecuteResponse> {
  const casesToRun = req.mode === 'test'
    ? req.test_cases.filter(tc => tc.is_public)
    : req.test_cases;

  const results: TestCaseResult[] = [];

  for (const tc of casesToRun) {
    const result = await runSingleTestCase(
      req.language,
      req.code,
      tc.id,
      tc.input,
      tc.expected_output,
      tc.is_public,
    );
    results.push(result);
  }

  const passed  = results.filter(r => r.passed).length;
  const total   = results.length;
  const success = total > 0 && passed === total;

  return { results, passed, total, success };
}

export function isValidLanguage(lang: string): lang is CodingLanguage {
  return lang === 'python3' || lang === 'javascript';
}

export async function checkExecutionHealth(): Promise<boolean> {
  if (!RAPIDAPI_KEY) return false;
  try {
    const res = await fetch(
      'https://judge0-ce.p.rapidapi.com/languages',
      {
        method:  'GET',
        headers: {
          'X-RapidAPI-Key':  RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}