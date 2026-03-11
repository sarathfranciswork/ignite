#!/usr/bin/env python3
"""
Lightweight coding agent for Qwen via Ollama's OpenAI-compatible API.

Gives Qwen tool-calling capabilities identical to Claude Code:
  bash, read_file, write_file, edit_file, list_files

Zero external dependencies — uses only stdlib + requests (pre-installed on
GitHub Actions runners).

Usage:
  python qwen-agent.py <system_prompt_file> <user_prompt_file>

Environment:
  LLM_BASE_URL   — OpenAI-compatible endpoint (e.g. https://qwen.sarathfrancis.work/v1)
  LLM_API_KEY    — API key (can be "dummy" for Ollama)
  LLM_MODEL      — Model name (default: qwen3-coder-next:q4_K_M)
  MAX_ITERATIONS  — Max tool-calling loops (default: 40)
"""

import glob as globmod
import json
import os
import re
import subprocess
import sys
from pathlib import Path

LLM_BASE_URL = os.environ["LLM_BASE_URL"]
LLM_API_KEY = os.environ.get("LLM_API_KEY", "dummy")
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen3-coder-next:q4_K_M")
MAX_ITERATIONS = int(os.environ.get("MAX_ITERATIONS", "40"))
REPO_ROOT = os.environ.get("REPO_ROOT", os.getcwd())

# ── Tool definitions (OpenAI function calling format) ──

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": (
                "Execute a bash command in the repository root and return stdout+stderr. "
                "Use for: git commands, running tests, installing packages, npm/npx, "
                "gh CLI for GitHub operations. Max 120s timeout."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The bash command to execute",
                    }
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": (
                "Read a file's contents. Returns the full text content. "
                "Use to understand existing code before making changes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative path from repo root (e.g. src/server/services/idea.service.ts)",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": (
                "Write content to a file, creating it and parent directories if needed. "
                "Use for creating new files. For modifying existing files, prefer edit_file."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative path from repo root",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full content to write to the file",
                    },
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": (
                "Replace a specific string in an existing file. The old_string must match "
                "exactly (including whitespace/indentation). Use for targeted edits to "
                "existing files without rewriting the entire file."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative path from repo root",
                    },
                    "old_string": {
                        "type": "string",
                        "description": "Exact string to find and replace",
                    },
                    "new_string": {
                        "type": "string",
                        "description": "Replacement string",
                    },
                },
                "required": ["path", "old_string", "new_string"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": (
                "List files matching a glob pattern. Returns one path per line. "
                "Use to explore the codebase structure."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Glob pattern (e.g. 'src/**/*.ts', 'prisma/*.prisma')",
                    }
                },
                "required": ["pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": (
                "Search for a pattern in files using grep. Returns matching lines "
                "with file paths and line numbers."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Search pattern (regex supported)",
                    },
                    "path": {
                        "type": "string",
                        "description": "Directory or file to search in (default: '.')",
                    },
                    "file_pattern": {
                        "type": "string",
                        "description": "File glob to filter (e.g. '*.ts')",
                    },
                },
                "required": ["pattern"],
            },
        },
    },
]

# ── Safety: blocked commands ──

BLOCKED_PATTERNS = [
    r"\brm\s+-rf\s+/",       # rm -rf /
    r"\brm\s+-rf\s+\*",      # rm -rf *
    r">\s*/dev/sd",           # writing to block devices
    r"\bdd\s+if=",            # dd
    r"\bmkfs\b",              # formatting filesystems
    r":(){",                  # fork bomb
]


def is_command_safe(cmd: str) -> bool:
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, cmd):
            return False
    return True


# ── Tool execution ──


def execute_tool(name: str, args: dict) -> str:
    try:
        if name == "bash":
            cmd = args["command"]
            if not is_command_safe(cmd):
                return f"BLOCKED: Command '{cmd[:100]}' is not allowed for safety reasons."
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=120,
                cwd=REPO_ROOT,
            )
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += ("\n" if output else "") + result.stderr
            if result.returncode != 0:
                output += f"\n[exit code: {result.returncode}]"
            return output[:15000] or "(no output)"

        elif name == "read_file":
            filepath = Path(REPO_ROOT) / args["path"]
            if not filepath.exists():
                return f"Error: File not found: {args['path']}"
            content = filepath.read_text(errors="replace")
            if len(content) > 20000:
                return content[:20000] + f"\n\n... (truncated, {len(content)} total chars)"
            return content

        elif name == "write_file":
            filepath = Path(REPO_ROOT) / args["path"]
            filepath.parent.mkdir(parents=True, exist_ok=True)
            filepath.write_text(args["content"])
            return f"Successfully wrote {len(args['content'])} chars to {args['path']}"

        elif name == "edit_file":
            filepath = Path(REPO_ROOT) / args["path"]
            if not filepath.exists():
                return f"Error: File not found: {args['path']}"
            content = filepath.read_text()
            old = args["old_string"]
            new = args["new_string"]
            count = content.count(old)
            if count == 0:
                return f"Error: old_string not found in {args['path']}. Make sure it matches exactly (including whitespace)."
            if count > 1:
                return f"Error: old_string found {count} times in {args['path']}. Provide a more specific match."
            content = content.replace(old, new, 1)
            filepath.write_text(content)
            return f"Successfully edited {args['path']}"

        elif name == "list_files":
            pattern = args["pattern"]
            files = sorted(globmod.glob(os.path.join(REPO_ROOT, pattern), recursive=True))
            # Return relative paths
            files = [os.path.relpath(f, REPO_ROOT) for f in files if os.path.isfile(f)]
            if not files:
                return "(no files matched)"
            return "\n".join(files[:200])

        elif name == "search_files":
            pattern = args["pattern"]
            search_path = args.get("path", ".")
            file_pattern = args.get("file_pattern", "")
            cmd = f"grep -rn --include='{file_pattern}' '{pattern}' '{search_path}'" if file_pattern else f"grep -rn '{pattern}' '{search_path}'"
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=REPO_ROOT,
            )
            output = result.stdout[:10000]
            return output or "(no matches)"

        return f"Unknown tool: {name}"

    except subprocess.TimeoutExpired:
        return "Error: Command timed out after 120 seconds"
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"


# ── LLM API call ──

try:
    import requests
except ImportError:
    # Fallback: use urllib (stdlib) if requests isn't available
    import urllib.request
    import urllib.error

    class _FallbackRequests:
        @staticmethod
        def post(url, headers=None, json_data=None, timeout=300):
            data = json.dumps(json_data).encode()
            req = urllib.request.Request(url, data=data, headers=headers or {})
            try:
                resp = urllib.request.urlopen(req, timeout=timeout)
                return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")
                raise RuntimeError(f"HTTP {e.code}: {body}")

    requests = None  # signal to use fallback


def chat_completion(messages: list, tools: list | None = None) -> dict:
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 8192,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    url = f"{LLM_BASE_URL}/chat/completions"

    if requests is not None:
        resp = requests.post(url, headers=headers, json=payload, timeout=300)
        resp.raise_for_status()
        return resp.json()
    else:
        return _FallbackRequests.post(url, headers=headers, json_data=payload, timeout=300)


# ── Agent loop ──


def run_agent(system_prompt: str, user_prompt: str) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    files_written = set()
    files_edited = set()

    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"\n{'='*60}")
        print(f"  Iteration {iteration}/{MAX_ITERATIONS}")
        print(f"  Files created: {len(files_written)} | Files edited: {len(files_edited)}")
        print(f"{'='*60}")

        try:
            result = chat_completion(messages, tools=TOOLS)
        except Exception as e:
            print(f"LLM API error: {e}")
            if iteration < 3:
                print("Retrying...")
                continue
            return f"Agent failed: LLM API error after {iteration} iterations: {e}"

        choice = result["choices"][0]
        message = choice["message"]
        finish_reason = choice.get("finish_reason", "")

        # Append assistant message
        messages.append(message)

        # Handle tool calls
        tool_calls = message.get("tool_calls", [])
        if tool_calls:
            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                try:
                    fn_args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    fn_args = {"error": "Failed to parse arguments"}

                # Log tool call
                args_preview = json.dumps(fn_args)
                if len(args_preview) > 300:
                    args_preview = args_preview[:300] + "..."
                print(f"\n  Tool: {fn_name}({args_preview})")

                output = execute_tool(fn_name, fn_args)

                # Track file modifications
                if fn_name == "write_file" and not output.startswith("Error"):
                    files_written.add(fn_args.get("path", ""))
                elif fn_name == "edit_file" and not output.startswith("Error"):
                    files_edited.add(fn_args.get("path", ""))

                output_preview = output[:500]
                if len(output) > 500:
                    output_preview += f"... ({len(output)} chars total)"
                print(f"  Result: {output_preview}")

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": output,
                    }
                )
        else:
            # No tool calls — agent is done (or responding with text)
            content = message.get("content", "")
            if content:
                print(f"\n  Agent says: {content[:1000]}")
            if finish_reason == "stop" or not tool_calls:
                print(f"\n  Agent completed after {iteration} iterations.")
                return content

    print(f"\nWARNING: Agent hit max iterations ({MAX_ITERATIONS})")
    print(f"Files created: {len(files_written)} | Files edited: {len(files_edited)}")
    if not files_written and not files_edited:
        print("ERROR: No files were modified. Agent failed to implement.")
        sys.exit(1)
    return f"Agent stopped: max iterations ({MAX_ITERATIONS}) reached"


# ── Entry point ──

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python qwen-agent.py <system_prompt_file> <user_prompt_file>")
        sys.exit(1)

    system_file = sys.argv[1]
    user_file = sys.argv[2]

    system_prompt = Path(system_file).read_text()
    user_prompt = Path(user_file).read_text()

    print(f"Model: {LLM_MODEL}")
    print(f"Endpoint: {LLM_BASE_URL}")
    print(f"Max iterations: {MAX_ITERATIONS}")
    print(f"Repo root: {REPO_ROOT}")

    result = run_agent(system_prompt, user_prompt)
    print(f"\n{'='*60}")
    print("  AGENT COMPLETE")
    print(f"{'='*60}")
