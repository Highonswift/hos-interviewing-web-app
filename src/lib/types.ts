export type QuizType = 'mcq' | 'coding' | 'mixed';

export type CodingLanguage = 'python3' | 'javascript';

export type QuizItemType = 'mcq' | 'coding';

export interface QuizItem {
  id:         string;
  quiz_id:    string;
  item_type:  QuizItemType;
  item_id:    string;
  position:   number;
  created_at: string;
}

export const LANGUAGE_META: Record<
  CodingLanguage,
  {
    label:       string;
    judge0Id:    number;
    monacoLang:  string;
    defaultCode: string;
  }
> = {
  python3: {
    label:      'Python 3',
    judge0Id:   71,
    monacoLang: 'python',
    defaultCode: [
      '# Write your solution here',
      '',
      'import sys',
      'input = sys.stdin.readline',
      '',
      'def solve():',
      '    pass',
      '',
      'solve()',
      '',
    ].join('\n'),
  },

  javascript: {
    label:      'JavaScript',
    judge0Id:   63,
    monacoLang: 'javascript',
    defaultCode: [
      '// Write your solution here',
      '',
      'const lines = require("fs")',
      '  .readFileSync("/dev/stdin", "utf8")',
      '  .trim()',
      '  .split("\\n");',
      'let idx = 0;',
      '',
      'function solve() {',
      '  // your code here',
      '}',
      '',
      'solve();',
      '',
    ].join('\n'),
  },
};

export interface Quiz {
  id:           string;
  title:        string;
  domain:       string;
  active_from:  string;
  active_until: string;
  admin_id:     string;
  created_at:   string;
  type:         QuizType;
  short_code?:  string | null;
}

export interface QuizSection {
  id:         string;
  quiz_id:    string;
  name:       string;
  position:   number;
  created_at: string;
}

export interface Question {
  id:                  string;
  quiz_id:             string;
  section_id?:         string | null;
  question_text:       string;
  options:             string[];
  correct_answer:      string;
  time_limit_seconds:  number;
  image_url?:          string | null;
  created_at:          string;
}

export interface Result {
  id:               string;
  quiz_id:          string;
  candidate_name:   string;
  candidate_email?: string | null;
  created_at:       string;
  score:            number;
  answers:          Record<string, string>;
  tab_switch_count: number;
  submission_type:  'mcq' | 'coding' | 'mixed' | null;
  status?:          'completed' | 'in_progress' | 'timed_out' | null;
  code:             string | null;
  language:         CodingLanguage | null;
  test_results:     TestCaseResult[] | null;
}

export interface CodingQuestion {
  id:               string;
  quiz_id:          string;
  title:            string;
  description:      string;
  language_options: CodingLanguage[];
  time_limit_seconds: number;
  created_at:       string;
}

export interface TestCase {
  id:              string;
  question_id:     string;
  input:           string;
  expected_output: string;
  is_public:       boolean;
  created_at:      string;
}

export interface TestCaseResult {
  test_case_id:    string;
  input:           string;
  expected_output: string;
  actual_output:   string;
  passed:          boolean;
  error:           string | null;
  time_ms:         number | null;
  is_public:       boolean;
}

export interface ExecuteRequest {
  language:   CodingLanguage;
  code:       string;
  mode:       'test' | 'submit';
  test_cases: Pick<TestCase, 'id' | 'input' | 'expected_output' | 'is_public'>[];
}

export interface ExecuteResponse {
  results: TestCaseResult[];
  passed:  number;
  total:   number;
  success: boolean;
}

export interface Judge0Response {
  stdout:      string | null;
  stderr:      string | null;
  compile_output: string | null;
  message:     string | null;
  status: {
    id:          number;
    description: string;
  };
  time:        string | null;
  memory:      number | null;
}

export const JUDGE0_STATUS = {
  ACCEPTED:           3,
  WRONG_ANSWER:       4,
  TIME_LIMIT:         5,
  COMPILE_ERROR:      6,
  RUNTIME_ERROR_MIN:  7,
  RUNTIME_ERROR_MAX:  12,
} as const;

export type QuizSummary = Pick<Quiz, 'id' | 'title' | 'domain' | 'type'>;

export interface CodingQuestionDraft {
  title:              string;
  description:        string;
  language_options:   CodingLanguage[];
  time_limit_seconds: number;
}

export interface TestCaseDraft {
  input:           string;
  expected_output: string;
  is_public:       boolean;
}

export interface CodingSession {
  quiz_id:      string;
  question_id:  string;
  language:     CodingLanguage;
  code:         string;
  last_saved:   string;
}

export interface QuestionSubmission {
  question_id:   string;
  question_title: string;
  language:      CodingLanguage;
  code:          string;
  test_results:  TestCaseResult[];
  passed:        number;
  total:         number;
}