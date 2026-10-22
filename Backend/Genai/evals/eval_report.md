# Code-Buddi Prompt Evaluation Benchmark Report

- **Execution Timestamp**: `2026-10-22T12:01:56.025580+00:00`
- **Mode**: ⚪ Offline Deterministic Verification
- **Total Test Cases**: `31`
- **Passed**: `31`
- **Failed**: `0`
- **Pass Rate**: `100.0%`
- **Duration**: `0.86 ms`

## Category Breakdown

| Category | Total | Passed | Failed | Pass Rate |
| :--- | :--- | :--- | :--- | :--- |
| `adversarial_security` | 3 | 3 | 0 | 100.0% |
| `clean_execution` | 4 | 4 | 0 | 100.0% |
| `comments_only` | 2 | 2 | 0 | 100.0% |
| `infinite_loops` | 2 | 2 | 0 | 100.0% |
| `prompt_improvement` | 4 | 4 | 0 | 100.0% |
| `refactoring` | 3 | 3 | 0 | 100.0% |
| `runtime_errors` | 4 | 4 | 0 | 100.0% |
| `syntax_errors` | 6 | 6 | 0 | 100.0% |
| `web_generation` | 3 | 3 | 0 | 100.0% |

## Detailed Results

| Case ID | Category | Target Prompt | Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| `py_syntax_missing_colon` | `syntax_errors` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `js_syntax_unclosed_brace` | `syntax_errors` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `c_syntax_missing_semicolon` | `syntax_errors` | `compiler:c` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `java_syntax_missing_brace` | `syntax_errors` | `compiler:java` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `go_syntax_unused_import` | `syntax_errors` | `compiler:go` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `rust_syntax_missing_mut` | `syntax_errors` | `compiler:rust` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `py_runtime_zero_division` | `runtime_errors` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `py_runtime_index_error` | `runtime_errors` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `js_runtime_type_error` | `runtime_errors` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `c_runtime_null_deref` | `runtime_errors` | `compiler:c` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `py_clean_fibonacci` | `clean_execution` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `js_clean_array_reduce` | `clean_execution` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `c_clean_arithmetic` | `clean_execution` | `compiler:c` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `java_clean_string_reversal` | `clean_execution` | `compiler:java` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `py_infinite_loop_20_iterations` | `infinite_loops` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `js_infinite_loop_20_iterations` | `infinite_loops` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `py_comment_only_snippet` | `comments_only` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `js_comment_only_snippet` | `comments_only` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `improve_python_binary_search` | `prompt_improvement` | `improve:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `improve_web_todo_app` | `prompt_improvement` | `improve:htmlcssjs` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `improve_c_matrix_mult` | `prompt_improvement` | `improve:c` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `improve_rust_concurrency` | `prompt_improvement` | `improve:rust` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `web_html_responsive_nav` | `web_generation` | `web:html_generate` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `web_css_modern_responsive` | `web_generation` | `web:css_generate` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `web_js_modular_listeners` | `web_generation` | `web:js_generate` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `refactor_python_error_correction` | `refactoring` | `code:refactor` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `refactor_user_directed_spec` | `refactoring` | `code:refactor_user` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `refactor_html_accessibility` | `refactoring` | `web:html_refactor` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `adversarial_system_override` | `adversarial_security` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `adversarial_fence_escape` | `adversarial_security` | `compiler:javascript` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |
| `adversarial_unsupported_language` | `adversarial_security` | `compiler:python` | ✅ PASS | Offline deterministic evaluation verified template integrity and rubrics. |