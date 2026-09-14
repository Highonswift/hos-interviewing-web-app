import { NextRequest, NextResponse } from 'next/server';
import { runCode, isValidLanguage, checkExecutionHealth } from '@/lib/execute';
import { ExecuteRequest } from '@/lib/types';

const MAX_CODE_LENGTH  = 50_000;
const MAX_TEST_CASES   = 20;
const MAX_INPUT_LENGTH = 10_000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Request body must be a JSON object.' },
      { status: 400 },
    );
  }

  const { language, code, mode, test_cases } =
    body as Record<string, unknown>;

  if (typeof language !== 'string' || !isValidLanguage(language)) {
    return NextResponse.json(
      { error: 'Invalid language. Supported: python3, javascript, c.' },
      { status: 400 },
    );
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json(
      { error: 'code must be a non-empty string.' },
      { status: 400 },
    );
  }
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: `code exceeds maximum length of ${MAX_CODE_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (mode !== 'test' && mode !== 'submit') {
    return NextResponse.json(
      { error: 'mode must be "test" or "submit".' },
      { status: 400 },
    );
  }

  if (!Array.isArray(test_cases) || test_cases.length === 0) {
    return NextResponse.json(
      { error: 'test_cases must be a non-empty array.' },
      { status: 400 },
    );
  }
  if (test_cases.length > MAX_TEST_CASES) {
    return NextResponse.json(
      { error: `Too many test cases. Maximum is ${MAX_TEST_CASES}.` },
      { status: 400 },
    );
  }

  for (let i = 0; i < test_cases.length; i++) {
    const tc = test_cases[i];
    if (
      typeof tc !== 'object' || tc === null ||
      typeof tc.id              !== 'string'  ||
      typeof tc.input           !== 'string'  ||
      typeof tc.expected_output !== 'string'  ||
      typeof tc.is_public       !== 'boolean'
    ) {
      return NextResponse.json(
        {
          error: `test_cases[${i}] must have: ` +
                 `id (string), input (string), expected_output (string), is_public (boolean).`,
        },
        { status: 400 },
      );
    }
    if (tc.input.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `test_cases[${i}].input exceeds ${MAX_INPUT_LENGTH} characters.` },
        { status: 400 },
      );
    }
  }

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json(
      {
        error:       'Code execution is not configured. RAPIDAPI_KEY is missing.',
        setup_error: true,
      },
      { status: 503 },
    );
  }

  const healthy = await checkExecutionHealth();
  if (!healthy) {
    return NextResponse.json(
      {
        error:        'Code execution service is temporarily unavailable. ' +
                      'Check your RAPIDAPI_KEY or try again shortly.',
        service_down: true,
      },
      { status: 503 },
    );
  }

  const executeReq: ExecuteRequest = { language, code, mode, test_cases };

  try {
    const result = await runCode(executeReq);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected execution error.';
    console.error('[/api/execute] Unhandled error:', message);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const keySet = !!process.env.RAPIDAPI_KEY;
  const healthy = keySet ? await checkExecutionHealth() : false;

  return NextResponse.json(
    {
      status:    healthy ? 'ok' : keySet ? 'degraded' : 'unconfigured',
      service:   'Judge0 CE via RapidAPI',
      key_set:   keySet,
      message:   !keySet
        ? 'RAPIDAPI_KEY is not set in environment variables.'
        : healthy
        ? 'Code execution service is operational.'
        : 'Judge0 API is unreachable or key is invalid.',
    },
    { status: healthy ? 200 : 503 },
  );
}