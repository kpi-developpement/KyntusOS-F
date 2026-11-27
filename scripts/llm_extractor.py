#!/usr/bin/env python3
"""
LLM Project Extractor v2
Kaydir pack l projet kamel f fichier Markdown wa7ed, s8ir f tokens w mfhoum l ay LLM:
  overview (stack, endpoints, routes, models) + arborescence compacte + code n9i.

Stdlib only. Optionnel: `pip install tiktoken pathspec` (tokens exacts + .gitignore kamel).
"""
import argparse
import ast
import datetime
import difflib
import fnmatch
import hashlib
import json
import os
import posixpath
import re
import sys
import warnings
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

VERSION = "3.0"

# ───────────────────────────── CONFIG ─────────────────────────────

IGNORE_DIRS = {
    '.git', '.svn', '.hg', 'node_modules', 'bower_components', 'jspm_packages', 'vendor',
    'venv', '.venv', 'env', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox',
    '.idea', '.vscode', '.vs', 'build', 'dist', 'out', 'target', 'bin', 'obj',
    '.next', '.nuxt', '.svelte-kit', '.angular', '.turbo', '.vercel', '.netlify', '.expo',
    '.cache', '.parcel-cache', 'coverage', '.nyc_output', '.gradle', '.mvn', '.terraform',
    'storybook-static', 'logs', 'tmp', 'temp', '.yarn', '.pnpm-store',
    'packages', 'third_party', 'thirdparty', 'third-party',
}
KEEP_HIDDEN_DIRS = {'.github'}

SKIP_EXTS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.avif', '.bmp', '.tiff', '.psd', '.svg',
    '.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.ogg', '.flac',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt',
    '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.bz2', '.xz',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar', '.war', '.ear', '.pyc', '.pyo',
    '.db', '.sqlite', '.sqlite3', '.mdb', '.lock', '.lockb', '.log',
    '.glb', '.gltf', '.fbx', '.obj', '.stl', '.hdr', '.exr', '.ktx2', '.usdz', '.blend',
    '.wasm', '.map', '.snap', '.tsbuildinfo',
}
SKIP_NAMES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'composer.lock', 'poetry.lock',
    'pipfile.lock', 'gemfile.lock', 'cargo.lock', 'go.sum', 'mix.lock', 'pubspec.lock',
    'mvnw', 'mvnw.cmd', 'gradlew', 'gradlew.bat', 'next-env.d.ts', '.ds_store', 'thumbs.db',
    '.gitignore', '.gitattributes', '.npmrc', '.nvmrc', '.prettierignore', '.eslintignore', '.dockerignore',
    'license', 'license.md', 'license.txt', 'changelog.md',
}
SKIP_SUFFIXES = ('.min.js', '.min.css', '.bundle.js', '.chunk.js', '.d.ts.map', '.generated.ts',
                 '.designer.cs', '.designer.vb', '.designer.xml', '.g.cs', '.g.i.cs', '.generated.cs')
SKIP_NAMES |= {'assemblyinfo.cs', 'globalsuppressions.cs', 'connectedservice.json', 'packages.config',
               'aboutassets.txt', 'aboutresources.txt', 'third-party.txt'}
GENERATED_DIR_RE = re.compile(r'(^|/)(connected services|service references|web references)/', re.I)
DOTNET_XMLDOC_RE = re.compile(r'^\s*(<\?xml[^>]*\?>\s*)?<doc>\s*<assembly>', re.I)
# Commercial UI SDKs copied into the repo (themes, docs, binaries): never your code
VENDOR_DIR_RE = re.compile(r'^(telerik|devexpress|syncfusion|infragistics|componentone|themes\.implicit|'
                           r'buildprocesstemplates|rcwpf|nuget|bower|jquery[\w.-]*|fontawesome[\w.-]*)$', re.I)
VENDOR_FILE_RE = re.compile(r'^(telerik|devexpress|syncfusion|infragistics|c1)\.', re.I)
SUMMARY_ONLY_EXTS = {'.csproj', '.vbproj', '.fsproj', '.sln'}   # used for the overview, never dumped

SECRET_NAME_RE = re.compile(
    r'^(\.env(\..+)?|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|.*\.(pem|key|p12|pfx|jks|keystore|crt|cer|der)'
    r'|credentials(\.json)?|service[-_]?account.*\.json|.*secrets?\.(json|ya?ml|properties))$', re.I)
SAFE_ENV_RE = re.compile(r'^\.env\.(example|sample|template|dist|defaults)$', re.I)

# ext -> (markdown tag, comment family)
LANGS = {
    '.java': ('java', 'c'), '.kt': ('kotlin', 'c'), '.kts': ('kotlin', 'c'), '.scala': ('scala', 'c'),
    '.groovy': ('groovy', 'c'), '.gradle': ('groovy', 'c'),
    '.ts': ('ts', 'c'), '.tsx': ('tsx', 'c'), '.js': ('js', 'c'), '.jsx': ('jsx', 'c'),
    '.mjs': ('js', 'c'), '.cjs': ('js', 'c'),
    '.go': ('go', 'c'), '.rs': ('rust', 'c'), '.c': ('c', 'c'), '.h': ('c', 'c'), '.cpp': ('cpp', 'c'),
    '.hpp': ('cpp', 'c'), '.cs': ('cs', 'c'), '.swift': ('swift', 'c'), '.dart': ('dart', 'c'),
    '.php': ('php', 'c'), '.prisma': ('prisma', 'c'), '.proto': ('proto', 'c'),
    '.css': ('css', 'css'), '.scss': ('scss', 'c'), '.less': ('less', 'c'),
    '.py': ('py', 'py'),
    '.html': ('html', 'xml'), '.xml': ('xml', 'xml'), '.vue': ('vue', 'none'), '.svelte': ('svelte', 'none'),
    '.json': ('json', 'json'), '.yml': ('yaml', 'hash'), '.yaml': ('yaml', 'hash'), '.toml': ('toml', 'hash'),
    '.properties': ('properties', 'hash'), '.ini': ('ini', 'hash'), '.conf': ('conf', 'hash'),
    '.sh': ('bash', 'hash'), '.ps1': ('powershell', 'hash'), '.rb': ('ruby', 'hash'),
    '.sql': ('sql', 'sql'), '.graphql': ('graphql', 'hash'), '.gql': ('graphql', 'hash'),
    '.md': ('md', 'none'), '.mdx': ('mdx', 'none'), '.txt': ('text', 'none'),
    '.ejs': ('ejs', 'none'), '.twig': ('twig', 'none'), '.hbs': ('hbs', 'none'),
    '.glsl': ('glsl', 'c'), '.vert': ('glsl', 'c'), '.frag': ('glsl', 'c'),
    '.xaml': ('xml', 'xml'), '.config': ('xml', 'xml'), '.cshtml': ('cshtml', 'none'), '.razor': ('razor', 'none'),
    '.aspx': ('aspx', 'none'), '.vb': ('vb', 'none'),
    '.csproj': ('xml', 'xml'), '.vbproj': ('xml', 'xml'), '.fsproj': ('xml', 'xml'), '.sln': ('text', 'none'),
}
SPECIAL_NAMES = {
    'dockerfile': ('dockerfile', 'hash'), 'makefile': ('makefile', 'hash'),
    'jenkinsfile': ('groovy', 'c'), 'procfile': ('text', 'none'),
}
SKELETON_EXTS = {'.java', '.kt', '.kts', '.scala', '.groovy', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
                 '.go', '.rs', '.c', '.h', '.cpp', '.hpp', '.cs', '.swift', '.dart', '.php', '.py', '.sql'}
JVM_EXTS = {'.java', '.kt', '.kts', '.scala', '.groovy'}
JS_EXTS = ('.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs')

MANIFESTS = {'package.json', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json',
             'requirements.txt', 'pyproject.toml', 'go.mod'}

# ───────────────────────────── TOKENS ─────────────────────────────

_ENC = None


def count_tokens(text):
    global _ENC
    if _ENC is None:
        try:
            import tiktoken
            _ENC = tiktoken.get_encoding("o200k_base")
        except Exception:
            _ENC = False
    if _ENC:
        return len(_ENC.encode(text, disallowed_special=()))
    return int(len(text) / 3.5) + 1

# ───────────────────────────── GITIGNORE ─────────────────────────────


class GitIgnore:
    def __init__(self):
        try:
            import pathspec
            self.pathspec = pathspec
        except ImportError:
            self.pathspec = None
        self.specs = []   # (base, spec)        -> pathspec mode
        self.rules = []   # (base, pat, neg, dir_only, anchored) -> fallback mode

    def load(self, dirpath, rel_dir):
        p = os.path.join(dirpath, '.gitignore')
        if not os.path.isfile(p):
            return
        with open(p, encoding='utf-8', errors='ignore') as fh:
            lines = fh.read().splitlines()
        if self.pathspec:
            self.specs.append((rel_dir, self.pathspec.PathSpec.from_lines('gitwildmatch', lines)))
            return
        for raw in lines:
            l = raw.strip()
            if not l or l.startswith('#'):
                continue
            neg = l.startswith('!')
            l = l[1:] if neg else l
            dir_only = l.endswith('/')
            l = l.rstrip('/')
            anchored = '/' in l
            self.rules.append((rel_dir, l.lstrip('/'), neg, dir_only, anchored))

    def ignored(self, rel, is_dir):
        res = False
        if self.pathspec:
            for base, spec in self.specs:
                if base and not rel.startswith(base + '/'):
                    continue
                sub = rel[len(base) + 1:] if base else rel
                if spec.match_file(sub + ('/' if is_dir else '')):
                    res = True
            return res
        for base, pat, neg, dir_only, anchored in self.rules:
            if base and not rel.startswith(base + '/'):
                continue
            if dir_only and not is_dir:
                continue
            sub = rel[len(base) + 1:] if base else rel
            target = sub if anchored else sub.rsplit('/', 1)[-1]
            if fnmatch.fnmatchcase(target, pat):
                res = not neg
        return res

# ───────────────────────────── SECRETS ─────────────────────────────


SECRET_KV_RE = re.compile(
    r'''(?im)^(\s*["']?[\w.\-]*(?:password|passwd|pwd|secret|token|api[_\-.]?key|apikey|private[_\-.]?key|'''
    r'''access[_\-.]?key|client[_\-.]?secret|credentials?)[\w.\-]*["']?\s*[:=]\s*)(.+?)(\s*,?\s*)$''')
SECRET_HINTS = ('secret', 'passw', 'pwd', 'key', 'token', 'credential', 'begin', '://', 'akia', 'sk-', 'sk_',
                'pk_', 'rk_', 'ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_', 'xox', 'aiza', 'eyj')
SECRET_HINT_RE = re.compile(r'secret|passw|pwd|api_?key|apikey|access_?key|private_?key|token', re.I)
SECRET_CODE_RE = re.compile(r'''(\b[A-Za-z_][\w.\-]*["']?\s*[:=]\s*)(["'])([^"'\s]{8,})\2''')
SECRET_PATTERNS = [
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}'),
    re.compile(r'\bsk-(?:proj-|ant-)?[A-Za-z0-9_\-]{20,}'),
    re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(r'\bxox[abpr]-[A-Za-z0-9\-]{10,}'),
    re.compile(r'\bAIza[0-9A-Za-z_\-]{35}'),
    re.compile(r'\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}'),
    re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----'),
    re.compile(r'(?<=://)[^/\s:@\'"]+:[^/\s@\'"]+(?=@)'),
    re.compile(r'(?i)(?:(?<=\bpassword=)|(?<=\bpwd=))[^;"\'<>\s]+'),   # connection strings: Password=xxx;
]
PLACEHOLDER_RE = re.compile(r'''^["']?\s*(\$\{|\{\{|<|process\.env|env\(|os\.environ|getenv|""|''|$|\*+|changeme|xxx|your)''', re.I)


def redact(text, family):
    n = 0

    def kv(m):
        nonlocal n
        val = m.group(2)
        if PLACEHOLDER_RE.match(val.strip()):
            return m.group(0)
        n += 1
        q = val[0] if val[:1] in '"\'' else ''
        return f'{m.group(1)}{q}***{q}{m.group(3)}'

    def code(m):
        nonlocal n
        if not SECRET_HINT_RE.search(m.group(1)) or PLACEHOLDER_RE.match(m.group(3)):
            return m.group(0)
        n += 1
        return f'{m.group(1)}{m.group(2)}***{m.group(2)}'

    low = text.lower()
    if not any(k in low for k in SECRET_HINTS):
        return text, 0
    if family in ('hash', 'json'):
        text = SECRET_KV_RE.sub(kv, text)
    text = SECRET_CODE_RE.sub(code, text)
    for p in SECRET_PATTERNS:
        text, k = p.subn('***', text)
        n += k
    return text, n

# ───────────────────────────── COMPACTION ─────────────────────────────


CMT = '\x01'  # marker: "a comment was here" -> lets tidy() drop comment-only lines


def _is_quote(s, i):
    """A quote that really opens a string. Word-internal apostrophes in JSX/HTML text
    (it's, l'utilisateur, J'ai) are not strings."""
    if s[i] == "'" and 0 < i < len(s) - 1 and s[i - 1].isalpha() and s[i + 1].isalpha():
        return False
    return True


def _skip_string(s, i):
    if s.startswith('"""', i):  # Java/Kotlin text blocks
        end = s.find('"""', i + 3)
        return len(s) if end < 0 else end + 3
    q, n, j = s[i], len(s), i + 1
    while j < n:
        ch = s[j]
        if ch == '\\':
            j += 2
            continue
        if ch == q:
            return j + 1
        if ch == '\n' and q != '`':
            return j
        j += 1
    return n


REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
REGEX_KW = ('return', 'typeof', 'case', 'in', 'of', 'void', 'yield', 'await', 'delete', 'throw')


def _regex_end(s, i):
    """If s[i] == '/' starts a JS regex literal, return the index after it, else -1."""
    j = i - 1
    while j >= 0 and s[j] in ' \t\n':
        j -= 1
    if j >= 0 and s[j] not in REGEX_PREV:
        k = j
        while k >= 0 and (s[k].isalnum() or s[k] in '_$'):
            k -= 1
        if s[k + 1:j + 1] not in REGEX_KW:
            return -1
    n, k, in_cls = len(s), i + 1, False
    while k < n:
        ch = s[k]
        if ch == '\\':
            k += 2
            continue
        if ch == '\n':
            return -1
        if ch == '[':
            in_cls = True
        elif ch == ']':
            in_cls = False
        elif ch == '/' and not in_cls:
            k += 1
            while k < n and s[k].isalpha():
                k += 1
            return k
        k += 1
    return -1


def strip_c_comments(src, line_comments=True, jsx=False):
    out, i, n, start = [], 0, len(src), 0
    while i < n:
        ch = src[i]
        if ch in '"\'`' and _is_quote(src, i):
            i = _skip_string(src, i)
            continue
        if ch == '/' and i + 1 < n and src[i + 1] in '/*' and (i == 0 or src[i - 1] not in '\\:'):
            if src[i + 1] == '*':
                end = src.find('*/', i + 2)
                end = n if end < 0 else end + 2
            elif line_comments:
                end = src.find('\n', i)
                end = n if end < 0 else end
                if jsx and ('</' in src[i:end] or '/>' in src[i + 2:end]):  # "//" inside JSX text
                    i += 2
                    continue
            else:
                i += 1
                continue
            out.append(src[start:i])
            out.append(CMT)
            i = start = end
            continue
        if ch == '/' and line_comments:
            j = _regex_end(src, i)
            if j > 0:
                i = j
                continue
        i += 1
    out.append(src[start:])
    return ''.join(out)


PY_TOKEN_RE = re.compile(
    r'''[rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|\Z)|\'\'\'[\s\S]*?(?:\'\'\'|\Z)|"(?:\\.|[^"\\\n])*(?:"|$)|'(?:\\.|[^'\\\n])*(?:'|$))|#[^\n]*''', re.M)


def strip_py_comments(src):
    def repl(m):
        t = m.group(0)
        if t[0] != '#':
            return t
        if t.startswith('#!') or (m.start() < 200 and 'coding' in t):
            return t
        return CMT
    return PY_TOKEN_RE.sub(repl, src)


IMPORT_LINE_RE = re.compile(r'^\s*(import|package)\s+[\w.*]+(\s+as\s+\w+)?\s*;?\s*$')
CS_USING_RE = re.compile(r'^\s*(global\s+)?using\s+(static\s+)?[\w.]+(\s*=\s*[\w.<>, ]+)?\s*;\s*$')
CS_NOISE_RE = re.compile(r'^\s*(#\s*(region|endregion|pragma)\b.*|\[assembly:.*\]\s*)$')


def tidy(text):
    out, blank = [], False
    for line in text.split('\n'):
        if CMT in line:
            line = line.replace(CMT, '')
            if not line.strip():
                continue
        line = line.rstrip()
        if not line:
            if blank or not out:
                continue
            blank = True
        else:
            blank = False
        out.append(line)
    return '\n'.join(out).strip('\n')


def compact_text(text, ext, family, keep_imports=False):
    if family == 'c':
        text = strip_c_comments(text, jsx=ext in ('.jsx', '.tsx', '.js', '.mjs'))
    elif family == 'css':
        text = strip_c_comments(text, line_comments=False)
    elif family == 'py':
        text = strip_py_comments(text)
    elif family == 'xml':
        text = re.sub(r'<!--[\s\S]*?-->', CMT, text)
        text = re.sub(r'<\?xml[^>]*\?>\s*', '', text)
        text = re.sub(r'\s+xmlns(:\w+)?="[^"]*"|\s+xsi:schemaLocation="[^"]*"', '', text)
    elif family == 'hash':
        text = re.sub(r'(?m)^[ \t]*#(?!!).*\n?', '', text)
    elif family == 'sql':
        text = re.sub(r'(?m)^[ \t]*--.*\n?', '', text)
    elif family == 'json':
        try:
            obj = json.loads(text)
            if len(text) > 3000:
                text = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
        except Exception:
            text = strip_c_comments(text)  # jsonc (tsconfig...)
    if ext in JVM_EXTS and not keep_imports:
        text = '\n'.join(l for l in text.split('\n') if not IMPORT_LINE_RE.match(l))
    elif ext == '.cs':
        text = '\n'.join(l for l in text.split('\n')
                         if not CS_NOISE_RE.match(l) and (keep_imports or not CS_USING_RE.match(l)))
    return tidy(text)

# ───────────────────────────── SKELETON (signatures only) ─────────────────────────────


FUNC_TAIL_RE = re.compile(r'(?:\)\s*(?:throws\s+[\w.,\s<>]+|:\s*[^;{}=]+|->\s*[^;{}=]+|const|override)?|=>|->)\s*$')
CTRL_RE = re.compile(r'^\)?\s*(?:else\s+)?(?:if|for|foreach|while|switch|catch|do|try|synchronized|using|lock|with|when|return|throw)\b')
TYPE_DECL_RE = re.compile(r'(?<![.\w])(?:class|interface|enum|record|struct|trait|impl|namespace|object)\s+[A-Za-z_]')
STR_LIT_RE = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'')


def _match(s, i, op, cl):
    depth, n, j = 0, len(s), i
    while j < n:
        ch = s[j]
        if ch in '"\'`' and _is_quote(s, j):
            j = _skip_string(s, j)
            continue
        if ch == '/':
            k = _regex_end(s, j)
            if k > 0:
                j = k
                continue
        if ch == op:
            depth += 1
        elif ch == cl:
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return -1


def _is_func_header(h):
    h = STR_LIT_RE.sub('""', h).strip()
    return bool(h) and bool(FUNC_TAIL_RE.search(h)) and not CTRL_RE.match(h) and not TYPE_DECL_RE.search(h)


def skeleton_c(src):
    out, i, n, start, last, paren = [], 0, len(src), 0, 0, 0
    while i < n:
        ch = src[i]
        if ch in '"\'`' and _is_quote(src, i):
            i = _skip_string(src, i)
            continue
        if ch == '/':
            j = _regex_end(src, i)
            if j > 0:
                i = j
                continue
        if ch == '(':
            if src[last:i].rstrip().endswith('=>'):
                j = _match(src, i, '(', ')')
                if j > 0:
                    out += [src[start:i], '( … )']
                    i = start = j
                    continue
            paren += 1
        elif ch == ')':
            paren = max(0, paren - 1)
        elif ch == '{':
            if _is_func_header(src[last:i]):
                j = _match(src, i, '{', '}')
                if j > 0:
                    out += [src[start:i], '{ … }']
                    i = start = last = j
                    continue
            last = i + 1
        elif ch == '}' or (ch == ';' and paren == 0):
            last = i + 1
        i += 1
    out.append(src[start:])
    return ''.join(out)


SQL_ROUTINE_RE = re.compile(r'\bCREATE\s+(?:OR\s+ALTER\s+)?(PROC(?:EDURE)?|FUNCTION|TRIGGER)\b', re.I)
SQL_AS_RE = re.compile(r'^\s*AS\b.*$', re.I | re.M)


def skeleton_sql(src):
    """Stored procedure / function / trigger -> header + parameters only."""
    m = SQL_ROUTINE_RE.search(src)
    if not m:
        return None
    a = SQL_AS_RE.search(src, m.end())
    if not a:
        return None
    rest = src[a.end():]
    return src[:a.end()] + ('\n  -- … body omitted' if rest.strip() else '')


def skeleton_py(src):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            tree = ast.parse(src)
    except Exception:
        return None
    lines, cuts = src.split('\n'), []

    def visit(node):
        for ch in ast.iter_child_nodes(node):
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
                first = ch.body[0]
                if first.lineno <= ch.lineno or lines[first.lineno - 1][:first.col_offset].strip():
                    continue  # body on the same line as the signature -> keep as is
                ind = ' ' * first.col_offset
                repl = []
                doc = ast.get_docstring(ch)
                if doc and doc.strip():
                    first_line = doc.strip().splitlines()[0][:160].replace('\\', '/').replace('"', "'")
                    repl.append(f'{ind}"""{first_line}"""')
                repl.append(ind + '...')
                cuts.append((first.lineno - 1, ch.end_lineno - 1, repl))
            elif isinstance(ch, ast.ClassDef):
                visit(ch)

    visit(tree)
    for s, e, repl in sorted(cuts, reverse=True):
        lines[s:e + 1] = repl
    return '\n'.join(lines)

# ───────────────────────────── DENSE MODE (lossless re-layout) ─────────────────────────────
# Same code, fewer tokens: 1-space indentation, no blank lines, lone `{` / `}` lines glued to their
# neighbour, attribute lines glued to the declaration, short blocks folded on one line.
# Multi-line strings are never touched.

ML_STRING_RE = re.compile(r'''@"(?:[^"]|"")*"|"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|`(?:\\.|[^`\\])*`''')
ATTR_LINE_RE = re.compile(r'^(\[[A-Za-z_][\w.]*(\s*\(.*\))?\]\s*)+$|^@[A-Za-z_][\w.]*(\s*\(.*\))?$')
CLOSE_LINE_RE = re.compile(r'^[\]})]+[;,)\]]*$')


def _protected_lines(text):
    """Line indexes that start inside a multi-line string literal."""
    prot = set()
    for m in ML_STRING_RE.finditer(text):
        a, b = m.start(), m.end()
        if '\n' not in text[a:b]:
            continue
        first = text.count('\n', 0, a)
        prot.update(range(first + 1, first + 1 + text.count('\n', a, b)))
    return prot


def _indent_unit(lines):
    deltas = Counter()
    prev = 0
    for l in lines:
        if not l.strip():
            continue
        ind = len(l) - len(l.lstrip(' '))
        if 0 < ind - prev <= 8:
            deltas[ind - prev] += 1
        prev = ind
    return deltas.most_common(1)[0][0] if deltas else 1


def _has_line_comment(content):
    c = STR_LIT_RE.sub('""', content).replace('://', '')
    return '//' in c


def _depth(content):
    c = STR_LIT_RE.sub('""', content)
    return c.count('{') - c.count('}')


def densify(text, family):
    if family in ('none', 'json'):
        return text
    if family == 'py':   # indentation is syntax and costs ~0 tokens: only drop blank lines
        return '\n'.join(l for l in text.split('\n') if l.strip())
    text = text.replace('\t', '    ')
    lines = text.split('\n')
    prot = _protected_lines(text) if family in ('c', 'py') else set()
    unit = _indent_unit([l for i, l in enumerate(lines) if i not in prot])
    rows = []   # [level, content, is_raw, attr_pending]
    for i, line in enumerate(lines):
        if i in prot:
            rows.append([0, line, True, False])
            continue
        st = line.strip()
        if not st:
            continue
        lvl = (len(line) - len(line.lstrip(' '))) // unit if unit > 1 else len(line) - len(line.lstrip(' '))
        prev = rows[-1] if rows and not rows[-1][2] else None
        if family in ('c', 'css') and prev and not prev[1].startswith('#') and not _has_line_comment(prev[1]):
            if prev[3] or (st == '{' and not prev[1].endswith('return')) or CLOSE_LINE_RE.match(st):
                prev[1] += ' ' + st
                prev[3] = False
                continue
        rows.append([lvl, st, False, family == 'c' and bool(ATTR_LINE_RE.match(st))])
    if family == 'c':   # fold short blocks:  `get {` / `return x;` / `}`  ->  `get { return x; }`
        for _ in range(3):
            out, j, changed = [], 0, False
            while j < len(rows):
                r = rows[j]
                if not r[2] and r[1].endswith('{') and _depth(r[1]) > 0:
                    d, k, txt = _depth(r[1]), j + 1, r[1]
                    while k < len(rows) and k - j <= 6 and not rows[k][2] and len(txt) < 160:
                        if txt[-1] not in '{;},[(:' and not rows[k][1].startswith(('}', ')', ']')):
                            break   # no `;` -> joining could change meaning (JS without semicolons)
                        txt += ' ' + rows[k][1]
                        d += _depth(rows[k][1])
                        k += 1
                        if d <= 0:
                            break
                    if d <= 0 and len(txt) <= 160 and not _has_line_comment(txt):
                        out.append([r[0], txt, False, False])
                        j, changed = k, True
                        continue
                out.append(r)
                j += 1
            rows = out
            if not changed:
                break
    return '\n'.join(r[1] if r[2] else ' ' * r[0] + r[1] for r in rows)

# ───────────────────────────── NEAR-DUPLICATES (lossless) ─────────────────────────────


def _core(stem_a, stem_b):
    """PBOViewModel vs PECViewModel -> ('PBO', 'PEC')"""
    i = 0
    while i < min(len(stem_a), len(stem_b)) and stem_a[i] == stem_b[i]:
        i += 1
    j = 0
    while j < min(len(stem_a), len(stem_b)) - i and stem_a[-1 - j] == stem_b[-1 - j]:
        j += 1
    return stem_a[i:len(stem_a) - j], stem_b[i:len(stem_b) - j]


def mark_near_duplicates(entries):
    """Files that are ~copies of another file (same folder or same name) are shown as a diff."""
    pools = defaultdict(list)
    cands = [e for e in entries if e.status == 'base' and e.t_base > 150 and e.family != 'none']
    for e in sorted(cands, key=lambda e: e.rel):
        d = e.rel.rsplit('/', 1)[0] if '/' in e.rel else ''
        best, best_r = None, 0.0
        seen_ids = set()
        for b in pools[('dir', d, e.ext)] + pools[('name', e.name)]:
            if id(b) in seen_ids or not (0.7 < len(b.base) / max(1, len(e.base)) < 1.4):
                continue
            seen_ids.add(id(b))
            sm = difflib.SequenceMatcher(None, b.base.split('\n'), e.base.split('\n'), autojunk=False)
            if sm.quick_ratio() > best_r and sm.real_quick_ratio() > 0.6:
                r = sm.ratio()
                if r > best_r:
                    best, best_r = b, r
        diff_txt = None
        if best is not None:
            cb, ce = _core(os.path.splitext(best.name)[0], os.path.splitext(e.name)[0])
            norm = e.base.replace(ce, cb) if cb and ce and len(ce) >= 2 else e.base
            ren = cb and ce and len(ce) >= 2 and norm != e.base
            ud = list(difflib.unified_diff(best.base.split('\n'), norm.split('\n'), n=0, lineterm=''))[2:]
            head = f'≈ `{best.rel}`' + (f' with every `{cb}` → `{ce}`' if ren else '') + (', plus:' if ud else ' (identical)')
            diff_txt = head + ('\n' + '\n'.join(ud) if ud else '')
            if count_tokens(diff_txt) > 0.6 * e.t_base:
                diff_txt = None
        if diff_txt:
            e.diff_of, e.diff_text = best, diff_txt
            e.t_diff = count_tokens(diff_txt)
            best.priority += 30   # keep the base: others depend on it
        else:
            d = e.rel.rsplit('/', 1)[0] if '/' in e.rel else ''
            pools[('dir', d, e.ext)].append(e)
            pools[('name', e.name)].append(e)

# ───────────────────────────── FILE ENTRY ─────────────────────────────


PRIORITY_BONUS = [
    (re.compile(r'(^|/)(main|index|app|server|application|program)\.\w+$|application\.(java|kt)$|(^|/)app/(layout|page)\.\w+$'), 30),
    (re.compile(r'controller|(^|/)routes?/|(^|/)api/|router|endpoint|handler|resource\.(java|kt)$|(^|/)i?service\w*\.cs$|viewmodel'), 25),
    (re.compile(r'(^|/)tables/|businessobject|(^|/)(model|entites?)/'), 22),
    (re.compile(r'(^|/)readme\.md$'), 24),
    (re.compile(r'service|usecase|(^|/)domain/'), 22),
    (re.compile(r'entity|entities|model|schema|(^|/)types?/|\.types?\.\w+$'), 20),
    (re.compile(r'repositor|dao|(^|/)db/|prisma'), 15),
    (re.compile(r'config|security|middleware|auth|guard'), 15),
    (re.compile(r'(^|/)hooks?/|(^|/)use[a-z]|store|context|provider|(^|/)lib/'), 14),
    (re.compile(r'dto|request|response|mapper'), 10),
    (re.compile(r'(^|/)(components?|pages?|views?|screens?|layouts?)/'), 8),
    (re.compile(r'util|helper|common|shared|constant'), 4),
]
PRIORITY_MALUS = [
    (re.compile(r'(^|/)(tests?|__tests__|spec|e2e|cypress|__mocks__|fixtures?)/|\.(test|spec|stories)\.\w+$|tests?\.(java|kt|cs)$|[._]tests?/'), -35),
    (re.compile(r'archive|caduc|deprecated|obsolete|backup|(^|/)old/|(^|/)maquettes?/|buildtest|consoleapp\d|wpfapp\d|androidapp\d'), -40),
    (re.compile(r'\.xaml$|\.config$|(^|/)resources?/|\.(cshtml|razor|aspx)$'), -15),
    (re.compile(r'(^|/)(stored procedures|functions|declencheurs|triggers)/'), -10),
    (re.compile(r'(^|/)(locales?|i18n|translations?|messages)/'), -25),
    (re.compile(r'(^|/)(migrations?|seeds?|seeders)/'), -20),
    (re.compile(r'\.(css|scss|less)$'), -20),
    (re.compile(r'(^|/)(docs?|documents?|examples?|samples?|public|static|assets)/'), -15),
    (re.compile(r'\.(json|ya?ml|xml|toml|properties|ini|conf)$'), -5),
    (re.compile(r'(^|/)(pom\.xml|build\.gradle(\.kts)?|composer\.json|tsconfig\.json|jsconfig\.json)$'), -20),
]


class Entry:
    def __init__(self, rel, raw, lang, family):
        self.rel, self.raw, self.lang, self.family = rel, raw, lang, family
        self.name = rel.rsplit('/', 1)[-1]
        self.ext = os.path.splitext(self.name)[1].lower()
        self.direct = self.related = False
        self.status = 'base'
        self.base = self._skel = self._compact = None
        self._skel_done = True
        self.t_base = self.t_skel = self.t_raw = self.t_head = self.t_diff = 0
        self.priority = 50
        self.diff_of = self.diff_text = None
        self.mode = 'compact'

    def prepare(self, mode, keep_imports):
        self.t_raw = count_tokens(self.raw)
        self.mode = mode
        self._compact = compact_text(self.raw, self.ext, self.family, keep_imports)
        self.base = tidy(self.raw) if mode == 'full' else self._compact
        if mode == 'dense':
            self.base = densify(self._compact, self.family)
        self.t_base = count_tokens(self.base)
        self._skel_done = False
        if mode in ('skeleton',) and self.skel:
            self.status = 'skeleton'
        self.t_head = count_tokens(self.rel) + 10
        self._score()

    @property
    def skel(self):
        """Signatures-only version, computed lazily (only when the budget/mode needs it)."""
        if not self._skel_done:
            self._skel_done = True
            if self.ext in SKELETON_EXTS and not self.name.endswith('.blade.php') and self.t_base > 60:
                if self.family == 'py':
                    sk = skeleton_py(self._compact)
                elif self.family == 'sql':
                    sk = skeleton_sql(self._compact)
                else:
                    sk = skeleton_c(self._compact)
                if sk:
                    sk = tidy(sk)
                    if self.mode == 'dense':
                        sk = densify(sk, self.family)
                    if len(sk) < 0.8 * len(self.base):
                        self._skel, self.t_skel = sk, count_tokens(sk)
        return self._skel

    def _score(self):
        low = self.rel.lower()
        bonus = max([b for rx, b in PRIORITY_BONUS if rx.search(low)] or [0])
        malus = sum(m for rx, m in PRIORITY_MALUS if rx.search(low))
        self.priority = 50 + bonus + malus - min(15, self.t_base // 2000)
        if self.direct:
            self.priority += 100
        elif self.related:
            self.priority += 60

    def uses_diff(self):
        return bool(self.diff_of) and self.status == 'base' and self.diff_of.status == 'base'

    def cost(self):
        if self.status == 'omitted':
            return 0
        if self.uses_diff():
            return self.t_head + self.t_diff
        return self.t_head + (self.t_skel if self.status == 'skeleton' else self.t_base)

    def text(self):
        if self.uses_diff():
            return self.diff_text
        return self.skel if self.status == 'skeleton' else self.base

# ───────────────────────────── SCAN ─────────────────────────────


def _glob(rel, pats):
    name = rel.rsplit('/', 1)[-1]
    return any(fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(name, p) or rel.startswith(p.rstrip('/') + '/')
               for p in pats)


def detect_lang(name):
    low = name.lower()
    if SAFE_ENV_RE.match(name):
        return ('bash', 'hash')
    if low in SPECIAL_NAMES or low.startswith('dockerfile'):
        return SPECIAL_NAMES.get(low, ('dockerfile', 'hash'))
    return LANGS.get(os.path.splitext(low)[1])


def is_binary(path):
    try:
        with open(path, 'rb') as fh:
            return b'\0' in fh.read(8192)
    except OSError:
        return True


def read_text(path):
    with open(path, 'rb') as fh:
        data = fh.read()
    for enc in ('utf-8-sig', 'cp1252', 'latin-1'):
        try:
            return data.decode(enc).replace('\r\n', '\n').replace('\r', '\n')
        except UnicodeDecodeError:
            continue
    return None


def _head_is_xmldoc(path):
    try:
        with open(path, 'rb') as fh:
            return bool(DOTNET_XMLDOC_RE.match(fh.read(400).decode('utf-8', 'ignore')))
    except OSError:
        return False


ARCHIVE_DIR_RE = re.compile(r'archive|caduc|obsolete|deprecated|backup|^old$|^_old', re.I)


def scan(root, args, out_abs, out_stem):
    gi = None if args.no_gitignore else GitIgnore()
    found, skipped = [], defaultdict(list)
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root).replace(os.sep, '/')
        rel_dir = '' if rel_dir == '.' else rel_dir
        if gi:
            gi.load(dirpath, rel_dir)
        keep = []
        for d in sorted(dirnames):
            rd = f'{rel_dir}/{d}' if rel_dir else d
            if VENDOR_DIR_RE.match(d):
                skipped['vendor SDK dirs'].append(rd + '/')
                continue
            if not args.include_archives and ARCHIVE_DIR_RE.search(d):
                skipped['archive/old dirs'].append(rd + '/')
                continue
            if (d in IGNORE_DIRS or d.endswith('.egg-info')
                    or (d.startswith('.') and d not in KEEP_HIDDEN_DIRS)
                    or (gi and gi.ignored(rd, True)) or (args.exclude and _glob(rd, args.exclude))):
                continue
            keep.append(d)
        dirnames[:] = keep
        for f in sorted(filenames):
            rel = f'{rel_dir}/{f}' if rel_dir else f
            full = os.path.join(dirpath, f)
            low = f.lower()
            if os.path.abspath(full) == out_abs or low.startswith(out_stem.lower() + '.'):
                continue
            ext = os.path.splitext(low)[1]
            if SECRET_NAME_RE.match(f) and not SAFE_ENV_RE.match(f):
                skipped['secret'].append(rel)
                continue
            if low in SKIP_NAMES or low.endswith(SKIP_SUFFIXES) or GENERATED_DIR_RE.search(rel):
                skipped['lock/generated'].append(rel)
                continue
            if ext in SKIP_EXTS:
                skipped['binary/media'].append(rel)
                continue
            if VENDOR_FILE_RE.match(f):
                skipped['vendor files'].append(rel)
                continue
            if ext == '.xaml' and not args.xaml:
                skipped['xaml (--xaml bach tdkhlhom)'].append(rel)
                continue
            if ext == '.xml' and _head_is_xmldoc(full):
                skipped['vendor xml docs'].append(rel)   # Telerik.*.xml, Newtonsoft.Json.xml…
                continue
            if gi and gi.ignored(rel, False):
                skipped['gitignored'].append(rel)
                continue
            if args.exclude and _glob(rel, args.exclude):
                skipped['excluded'].append(rel)
                continue
            if args.include and not _glob(rel, args.include):
                skipped['not included'].append(rel)
                continue
            lang = detect_lang(f)
            if not lang:
                skipped['unknown type'].append(rel)
                continue
            try:
                size = os.path.getsize(full)
            except OSError:
                continue
            if size == 0:
                skipped['empty'].append(rel)
                continue
            if size > args.max_file_kb * 1024:
                skipped['too large'].append(f'{rel} ({size // 1024} KB)')
                continue
            if is_binary(full):
                skipped['binary/media'].append(rel)
                continue
            found.append((rel, full, lang))
    return found, skipped

# ───────────────────────────── RELATED FILES ─────────────────────────────


JS_IMPORT_RE = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]''', re.M)
PY_IMPORT_RE = re.compile(r'^\s*(?:from\s+(\.*[\w.]*)\s+import|import\s+([\w.]+))', re.M)
CAP_ID_RE = re.compile(r'\b[A-Z][A-Za-z0-9_]{2,}\b')
RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']
LANG_GROUPS = [JVM_EXTS, {'.php'}, {'.cs'}, {'.dart'}, {'.swift'}, {'.go'}]


JVM_ROOT_RE = re.compile(r'^(.*?/?src/(?:main|test)/(?:java|kotlin|scala)/)(.*)$')


def domain_keys(entries):
    """Path used for --domain matching, without the shared JVM package root
    (com/kyntus/blog/...) so `-d blog` doesn't match every Java file."""
    groups = defaultdict(list)
    for e in entries:
        m = JVM_ROOT_RE.match(e.rel)
        if m:
            groups[m.group(1).replace('/test/', '/main/')].append(m.group(2).split('/')[:-1])
    common = {}
    for root, dirs in groups.items():
        pre = os.path.commonprefix(dirs) if len(dirs) > 1 else []
        common[root] = '/'.join(pre)
    keys = {}
    for e in entries:
        m = JVM_ROOT_RE.match(e.rel)
        k = e.rel
        if m:
            pre = common.get(m.group(1).replace('/test/', '/main/'), '')
            rest = m.group(2)
            if pre and rest.startswith(pre + '/'):
                rest = rest[len(pre) + 1:]
            k = rest
        keys[e.rel] = k.lower()
    return keys


def build_index(entries):
    by_stem, paths = defaultdict(list), set()
    roots = {''}
    for e in entries:
        paths.add(e.rel)
        by_stem[os.path.splitext(e.name)[0]].append(e)
        if e.name in ('tsconfig.json', 'jsconfig.json', 'package.json') and '/' in e.rel:
            roots.add(e.rel.rsplit('/', 1)[0])
    return by_stem, paths, roots


def deps_of(e, by_stem, paths, roots):
    out = set()
    d = e.rel.rsplit('/', 1)[0] if '/' in e.rel else ''
    if e.ext in JS_EXTS or e.ext in ('.vue', '.svelte'):
        for spec in JS_IMPORT_RE.findall(e.raw):
            if spec.startswith('.'):
                bases = [posixpath.normpath(posixpath.join(d, spec))]
            elif spec[:2] in ('@/', '~/'):
                bases = [posixpath.normpath(posixpath.join(r, s, spec[2:])) for r in roots for s in ('', 'src')]
            else:
                continue
            for b in bases:
                hit = next((c for c in [b] + [b + x for x in RESOLVE_EXTS] + [b + '/index' + x for x in RESOLVE_EXTS]
                            if c in paths), None)
                if hit:
                    out.add(hit)
                    break
    elif e.ext == '.py':
        for frm, imp in PY_IMPORT_RE.findall(e.raw):
            mod = frm or imp
            dots = len(mod) - len(mod.lstrip('.'))
            name = mod.lstrip('.').replace('.', '/')
            base = d if dots else ''
            for _ in range(max(0, dots - 1)):
                base = posixpath.dirname(base)
            cb = posixpath.join(base, name) if name else base
            for c in (cb + '.py', cb + '/__init__.py'):
                if c in paths:
                    out.add(c)
            if not dots and name:
                out.update(p for p in paths if p.endswith('/' + name + '.py'))
    else:
        group = next((g for g in LANG_GROUPS if e.ext in g), None)
        if group:
            proj = e.rel.split('/')[:2]
            for ident in set(CAP_ID_RE.findall(e.raw)):
                cands = [o for o in by_stem.get(ident, ()) if o.rel != e.rel and o.ext in group]
                if len(cands) > 3:   # same class name in many layers (Entite.cs ×20) -> same project only
                    cands = [o for o in cands if o.rel.split('/')[:2] == proj]
                out.update(o.rel for o in cands)
    out.discard(e.rel)
    return out

# ───────────────────────────── OVERVIEW ─────────────────────────────


JS_LABELS = {
    'next': 'Next.js', 'react': 'React', 'vue': 'Vue', 'nuxt': 'Nuxt', '@angular/core': 'Angular',
    'svelte': 'Svelte', 'express': 'Express', '@nestjs/core': 'NestJS', 'fastify': 'Fastify',
    'three': 'Three.js', '@react-three/fiber': 'R3F', 'tailwindcss': 'Tailwind', '@prisma/client': 'Prisma',
    'mongoose': 'Mongoose', 'typeorm': 'TypeORM', 'drizzle-orm': 'Drizzle', 'typescript': 'TypeScript',
    'vite': 'Vite', '@reduxjs/toolkit': 'Redux', 'zustand': 'Zustand', '@tanstack/react-query': 'React Query',
    'next-auth': 'NextAuth', 'framer-motion': 'Framer Motion', 'gsap': 'GSAP', 'socket.io': 'Socket.IO',
    'electron': 'Electron', 'zod': 'Zod', 'axios': 'Axios', 'shadcn': 'shadcn/ui',
}
JVM_LABELS = {
    'spring-boot-starter-security': 'Spring Security', 'spring-boot-starter-data-jpa': 'JPA/Hibernate',
    'spring-boot-starter-data-mongodb': 'MongoDB', 'postgresql': 'PostgreSQL', 'mysql-connector-j': 'MySQL',
    'mysql-connector-java': 'MySQL', 'mariadb-java-client': 'MariaDB', 'h2': 'H2', 'lombok': 'Lombok',
    'poi': 'Apache POI', 'poi-ooxml': 'Apache POI', 'flyway-core': 'Flyway', 'liquibase-core': 'Liquibase',
    'mapstruct': 'MapStruct', 'jjwt-api': 'JWT', 'jjwt': 'JWT', 'spring-boot-starter-websocket': 'WebSocket',
    'springdoc-openapi-starter-webmvc-ui': 'OpenAPI', 'spring-kafka': 'Kafka', 'spring-boot-starter-amqp': 'RabbitMQ',
}


def summarize_manifest(e):
    labels, lines = [], []
    t = e.raw
    try:
        if e.name == 'package.json':
            d = json.loads(t)
            deps, dev = d.get('dependencies', {}) or {}, d.get('devDependencies', {}) or {}
            for k, lab in JS_LABELS.items():
                if k in deps or k in dev:
                    v = str(deps.get(k, dev.get(k, ''))).lstrip('^~>=')
                    labels.append(f'{lab} {v.split(".")[0]}' if k in ('next', 'react', 'vue', '@angular/core') and v[:1].isdigit() else lab)
            if d.get('scripts'):
                lines.append('scripts: ' + ' | '.join(f'{k}=`{v}`' for k, v in d['scripts'].items()))
            if deps:
                lines.append('deps: ' + ', '.join(f'{k}@{str(v).lstrip("^~")}' for k, v in deps.items()))
            if dev:
                lines.append('devDeps: ' + ', '.join(dev))
        elif e.name == 'pom.xml':
            root = ET.fromstring(re.sub(r'\sxmlns(:\w+)?="[^"]+"', '', t, count=3).encode())
            g = root.findtext('groupId') or root.findtext('parent/groupId') or ''
            a = root.findtext('artifactId') or ''
            pa, pv = root.findtext('parent/artifactId') or '', root.findtext('parent/version') or ''
            java = root.findtext('properties/java.version') or root.findtext('properties/maven.compiler.source')
            deps = [x.findtext('artifactId') or '' for x in root.findall('dependencies/dependency')]
            if 'spring-boot' in pa or any(x.startswith('spring-boot') for x in deps):
                labels.append(f'Spring Boot {pv}'.strip() if 'spring-boot' in pa else 'Spring Boot')
            if java:
                labels.append(f'Java {java}')
            labels += [JVM_LABELS[x] for x in deps if x in JVM_LABELS]
            starters = [x[len('spring-boot-starter-'):] for x in deps if x.startswith('spring-boot-starter-')]
            others = [x for x in deps if not x.startswith('spring-boot-starter-')]
            lines.append(f'{g}:{a}')
            if starters:
                lines.append('starters: ' + ', '.join(starters))
            if others:
                lines.append('deps: ' + ', '.join(others))
            mods = [m.text for m in root.findall('modules/module') if m.text]
            if mods:
                lines.append('modules: ' + ', '.join(mods))
        elif e.name.startswith('build.gradle'):
            m = re.search(r'org\.springframework\.boot[\'"]?\)?\s*version\s*[\'"]([^\'"]+)', t)
            if 'springframework.boot' in t:
                labels.append(f'Spring Boot {m.group(1)}' if m else 'Spring Boot')
            coords = re.findall(r'(?:implementation|api|compileOnly|runtimeOnly|annotationProcessor)\s*\(?\s*[\'"]([^\'"]+)[\'"]', t)
            arts = [c.split(':')[1] if ':' in c else c for c in coords]
            labels += [JVM_LABELS[x] for x in arts if x in JVM_LABELS]
            if arts:
                lines.append('deps: ' + ', '.join(arts))
        elif e.name == 'composer.json':
            d = json.loads(t)
            req = d.get('require', {}) or {}
            if 'laravel/framework' in req:
                labels.append('Laravel ' + str(req['laravel/framework']).lstrip('^~').split('.')[0])
            if 'symfony/framework-bundle' in req:
                labels.append('Symfony')
            labels.append('PHP')
            lines.append('require: ' + ', '.join(f'{k}@{v}' for k, v in req.items()))
        elif e.name in ('requirements.txt', 'pyproject.toml'):
            names = re.findall(r'(?im)^\s*["\']?([A-Za-z][\w\-.]*)\s*(?:[=<>~!\[]|["\']?,?\s*$)', t) if e.name == 'requirements.txt' \
                else re.findall(r'["\']([A-Za-z][\w\-.]*)\s*[=<>~!\[]', t)
            for k, lab in (('django', 'Django'), ('flask', 'Flask'), ('fastapi', 'FastAPI'), ('sqlalchemy', 'SQLAlchemy')):
                if any(n.lower() == k for n in names):
                    labels.append(lab)
            labels.append('Python')
            if names:
                lines.append('deps: ' + ', '.join(dict.fromkeys(names)))
        elif e.name == 'go.mod':
            m = re.search(r'^module\s+(\S+)', t, re.M)
            labels.append('Go')
            if m:
                lines.append('module ' + m.group(1))
    except Exception:
        pass
    return labels, lines


SPRING_RE = re.compile(r'^@(Get|Post|Put|Delete|Patch|Request)Mapping\b\s*(\((?:[^()]|\([^()]*\))*\))?\s*(.*)$')
NEST_RE = re.compile(r'^@(Get|Post|Put|Delete|Patch|All)\s*(\((?:[^()]|\([^()]*\))*\))\s*(.*)$')
NEST_CTRL_RE = re.compile(r'''^@Controller\s*\(\s*(?:\{[^}]*?path\s*:\s*)?['"`]([^'"`]*)''')
FIRST_STR_RE = re.compile(r'''["'`]([^"'`]*)["'`]''')
DECL_RE = re.compile(r'\b(class|interface)\s+\w+|(\w+)\s*(?:<[^>]*>)?\s*\(')
EXPRESS_RE = re.compile(r'''\b(?:app|router|\w+Router|server)\.(get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)''')
LARAVEL_RE = re.compile(r'''Route::(get|post|put|patch|delete|any|resource|apiResource)\(\s*['"]([^'"]+)''')
PYWEB_RE = re.compile(r'''^\s*@\w+\.(get|post|put|patch|delete|route|api_route)\(\s*['"]([^'"]+)''', re.M)
NEXT_FILE_RE = re.compile(r'^(page|route)\.(tsx|ts|jsx|js|mdx)$')
MODEL_RES = [
    (JVM_EXTS, re.compile(r'@(?:Entity|Document|Table)\b[\s\S]{0,400}?\b(?:class|record|data class)\s+(\w+)')),
    ({'.prisma'}, re.compile(r'^model\s+(\w+)\s*\{', re.M)),
    ({'.py'}, re.compile(r'^class\s+(\w+)\((?:[\w.]*Model|Base|SQLModel|Document)\)', re.M)),
    ({'.php'}, re.compile(r'class\s+(\w+)\s+extends\s+(?:Model|Authenticatable)\b')),
    (set(JS_EXTS), re.compile(r'''\bmodel\s*(?:<[^>]*>)?\(\s*['"](\w+)['"]''')),
]


DOTNET_LABELS = {
    'prism': 'Prism (MVVM)', 'telerik': 'Telerik UI', 'xamarin.forms': 'Xamarin.Forms', 'xamarin.essentials': 'Xamarin',
    'system.servicemodel': 'WCF', 'entityframework': 'Entity Framework', 'microsoft.entityframeworkcore': 'EF Core',
    'dapper': 'Dapper', 'newtonsoft.json': 'Newtonsoft.Json', 'unity': 'Unity IoC', 'autofac': 'Autofac',
    'nlog': 'NLog', 'serilog': 'Serilog', 'microsoft.office.interop.excel': 'Excel Interop (VSTO)',
    'microsoft.identity.client': 'MSAL/Azure AD', 'mailkit': 'MailKit', 'nunit': 'NUnit', 'xunit': 'xUnit',
    'mstest.testframework': 'MSTest', 'moq': 'Moq', 'automapper': 'AutoMapper', 'mediatr': 'MediatR',
    'microsoft.sharepoint': 'SharePoint', 'odoo': 'Odoo', 'swashbuckle': 'Swagger',
}


def summarize_dotnet(projects):
    """Aggregate all .csproj/.sln into a few lines: frameworks, project kinds, main packages."""
    fw, kinds, pkgs, labels = Counter(), Counter(), Counter(), []
    names = []
    for e in projects:
        if e.ext == '.sln':
            continue
        t = e.raw
        names.append(os.path.splitext(e.name)[0])
        for f in re.findall(r'<TargetFrameworks?>([^<]+)</TargetFrameworks?>', t):
            for x in f.split(';'):
                fw[x.strip()] += 1
        for f in re.findall(r'<TargetFrameworkVersion>v?([^<]+)</TargetFrameworkVersion>', t):
            fw[f'.NET Framework {f}'] += 1
        ot = re.search(r'<OutputType>([^<]+)</OutputType>', t)
        kind = ot.group(1) if ot else 'Library'
        if re.search(r'<UseWPF>true|PresentationFramework', t):
            kind = 'WPF ' + kind
        if 'Xamarin.Android' in t or 'MonoAndroid' in t:
            kind = 'Xamarin.Android'
        if 'Microsoft.NET.Sdk.Web' in t or 'System.Web' in t:
            kind = 'Web ' + kind
        if re.search(r'OfficeTools|VSTO', t):
            kind = 'Office Add-in (VSTO)'
        if re.search(r'\.Tests?\b|UnitTest', e.name):
            kind = 'Tests'
        kinds[kind] += 1
        refs = re.findall(r'<(?:PackageReference|Reference)\s+Include="([^",]+)', t)
        for r in refs:
            if not r.lower().startswith(('system', 'microsoft.csharp', 'mscorlib', 'windowsbase', 'presentation')) \
                    or r.lower().startswith('system.servicemodel'):
                pkgs[r.split(',')[0]] += 1
    for p in pkgs:
        low = p.lower()
        for k, lab in DOTNET_LABELS.items():
            if re.search(r'(^|\.)' + re.escape(k), low):
                labels.append(lab)
    lines = []
    if names:
        lines.append(f'**.NET projects:** {len(names)} — ' + ', '.join(f'{k} ×{v}' for k, v in kinds.most_common()))
    if fw:
        lines.append('**Frameworks:** ' + ', '.join(f'{k} ×{v}' for k, v in fw.most_common(6)))
    if pkgs:
        lines.append('**Main packages:** ' + ', '.join(f'{k}' + (f' ×{v}' if v > 1 else '') for k, v in pkgs.most_common(30)))
    return labels, lines


WCF_OP_RE = re.compile(r'^\s*\[\s*OperationContract\b')
CS_HTTP_RE = re.compile(r'^\s*\[\s*Http(Get|Post|Put|Delete|Patch)\s*(?:\(\s*"([^"]*)")?')
CS_ROUTE_RE = re.compile(r'^\s*\[\s*Route\s*\(\s*"([^"]*)"')
CS_METHOD_RE = re.compile(r'([A-Za-z_]\w*)\s*(?:<[^>]*>)?\s*\(')


def cs_contracts(text, name):
    """WCF [OperationContract] methods and ASP.NET [HttpGet] routes from a C# file."""
    ops, routes, prefix, pending = [], [], '', None
    for line in text.split('\n'):
        s = line.strip()
        if not s or s.startswith('//'):
            continue
        if WCF_OP_RE.match(s):
            pending = ('WCF', '')
            continue
        h = CS_HTTP_RE.match(s)
        if h:
            pending = (h.group(1).upper(), h.group(2) or '')
            continue
        r = CS_ROUTE_RE.match(s)
        if r:
            if pending:
                pending = (pending[0], r.group(1))
            else:
                prefix = r.group(1).replace('[controller]', re.sub(r'Controller$', '', name))
            continue
        if pending and not s.startswith('['):
            m = CS_METHOD_RE.search(s.split('=')[0])
            if m:
                if pending[0] == 'WCF':
                    ops.append(m.group(1))
                else:
                    routes.append(f'{pending[0]} {_join(prefix, pending[1])} ({m.group(1)})')
            pending = None
    return ops, routes


SQL_TABLE_RE = re.compile(r'\bCREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?', re.I)
SQL_OBJ_RE = re.compile(r'\bCREATE\s+(?:OR\s+ALTER\s+)?(PROC(?:EDURE)?|FUNCTION|VIEW|TRIGGER|TYPE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)', re.I)


def _join(*parts):
    p = '/'.join(x.strip('/') for x in parts if x and x.strip('/'))
    return '/' + p


def annotated_routes(text, nest=False):
    routes, prefix, pending = [], '', None
    rx = NEST_RE if nest else SPRING_RE
    for line in text.split('\n'):
        s = line.strip()
        if not s:
            continue
        if nest:
            c = NEST_CTRL_RE.match(s)
            if c:
                prefix = c.group(1)
                continue
        m = rx.match(s)
        if m:
            verb, args, rest = m.group(1).upper(), m.group(2) or '', m.group(3)
            sm = FIRST_STR_RE.search(args)
            path = sm.group(1) if sm else ''
            if verb == 'REQUEST':
                vm = re.search(r'RequestMethod\.(\w+)', args)
                verb = vm.group(1) if vm else 'ANY'
            pending = (verb, path)
            if not rest or rest.startswith('@'):
                continue
            s = rest
        if pending and not s.startswith('@'):
            dm = DECL_RE.search(s)
            if dm and dm.group(1):
                prefix = pending[1]
            elif dm:
                routes.append((pending[0], _join(prefix, pending[1]), dm.group(2)))
            pending = None
    return routes


def next_routes(entries):
    pages, apis = [], []
    for e in entries:
        parts = e.rel.split('/')
        if 'app' in parts[:-1] and NEXT_FILE_RE.match(e.name):
            k = parts.index('app')
            segs = [s for s in parts[k + 1:-1] if not (s.startswith('(') and s.endswith(')')) and not s.startswith(('@', '_'))]
            route = '/' + '/'.join(segs)
            if e.name.startswith('page.'):
                pages.append(route)
            else:
                ms = re.findall(r'export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b', e.raw)
                apis.append(f'{route} [{",".join(dict.fromkeys(ms)) or "?"}]')
        elif 'pages' in parts[:-1] and e.ext in JS_EXTS:
            k = parts.index('pages')
            stem = os.path.splitext(e.name)[0]
            if stem.startswith('_'):
                continue
            segs = parts[k + 1:-1] + ([] if stem == 'index' else [stem])
            route = '/' + '/'.join(segs)
            (apis if segs[:1] == ['api'] else pages).append(route)
    return sorted(set(pages)), sorted(set(apis))


def build_overview(all_entries, included, args):
    L = ['## Overview']
    labels, mlines = [], []
    for e in all_entries:
        if e.name in MANIFESTS:
            lab, lines = summarize_manifest(e)
            labels += lab
            if lines:
                mlines.append(f'- `{e.rel}` — ' + ' · '.join(lines))
    dn_labels, dn_lines = summarize_dotnet([e for e in all_entries if e.ext in SUMMARY_ONLY_EXTS])
    labels += dn_labels
    if labels:
        L.append('**Stack:** ' + ', '.join(dict.fromkeys(labels)))
    L += dn_lines
    langs = Counter(e.lang for e in included)
    L.append('**Files:** ' + ', '.join(f'{k} {v}' for k, v in langs.most_common()))
    if args.domain:
        nd = sum(e.direct for e in included)
        L.append(f'**Focus:** `{", ".join(args.domain)}` → {nd} matching files + {len(included) - nd} related (via imports/references)')
    if mlines:
        L += ['**Manifests:**'] + mlines

    by_ctrl, wcf = defaultdict(list), {}
    for e in included:
        if e.ext in JVM_EXTS and 'Mapping' in e.raw:
            for v, p, fn in annotated_routes(e.raw):
                by_ctrl[os.path.splitext(e.name)[0]].append(f'{v} {p} ({fn})')
        elif e.ext in JS_EXTS:
            if '@Controller' in e.raw:
                for v, p, fn in annotated_routes(e.raw, nest=True):
                    by_ctrl[os.path.splitext(e.name)[0]].append(f'{v} {p} ({fn})')
            for v, p in EXPRESS_RE.findall(e.raw):
                by_ctrl[e.rel].append(f'{v.upper()} {p}')
        elif e.ext == '.php':
            for v, p in LARAVEL_RE.findall(e.raw):
                by_ctrl[e.rel].append(f'{v.upper()} {_join(p)}')
        elif e.ext == '.py':
            for v, p in PYWEB_RE.findall(e.raw):
                by_ctrl[e.rel].append(f'{v.upper()} {p}')
        elif e.ext == '.cs' and ('OperationContract' in e.raw or '[Http' in e.raw):
            ops, routes = cs_contracts(e.raw, os.path.splitext(e.name)[0])
            if ops:
                wcf[os.path.splitext(e.name)[0]] = ops
            if routes:
                by_ctrl[os.path.splitext(e.name)[0]] += routes
    if wcf:
        L.append('\n### WCF service contracts')
        for k in sorted(wcf)[:150]:
            L.append(f'- **{k}**: ' + ', '.join(wcf[k]))
    if by_ctrl:
        L.append('\n### API endpoints')
        shown = 0
        for ctrl in sorted(by_ctrl):
            if shown >= 120:
                L.append(f'- … +{len(by_ctrl) - shown} more controllers')
                break
            L.append(f'- **{ctrl}**: ' + ' · '.join(by_ctrl[ctrl]))
            shown += 1

    pages, apis = next_routes(included)
    if pages or apis:
        L.append('\n### Front routes')
        if pages:
            L.append('- pages: ' + ' · '.join(f'`{p}`' for p in pages[:200]))
        if apis:
            L.append('- api: ' + ' · '.join(f'`{p}`' for p in apis[:200]))

    models = []
    for e in included:
        for exts, rx in MODEL_RES:
            if e.ext in exts:
                models += rx.findall(e.raw)
    if models:
        L.append('\n### Data models\n' + ', '.join(dict.fromkeys(models)))

    tables, objs = defaultdict(list), Counter()
    for e in included:
        if e.ext == '.sql':
            for sch, t in SQL_TABLE_RE.findall(e.raw):
                if not t.lower().endswith('_log') and not t.startswith('#'):
                    tables[sch or 'dbo'].append(t)
            for kind, sch, _ in SQL_OBJ_RE.findall(e.raw):
                objs[kind.upper().replace('PROCEDURE', 'PROC')] += 1
    if tables or objs:
        L.append('\n### SQL database')
        if objs:
            L.append('- objects: ' + ', '.join(f'{k.lower()} ×{v}' for k, v in objs.most_common()))
        for sch in sorted(tables):
            L.append(f'- `{sch}` tables: ' + ', '.join(dict.fromkeys(tables[sch])))
    return '\n'.join(L) + '\n'

# ───────────────────────────── TREE ─────────────────────────────


def build_tree(entries, root_name, max_files):
    """Compact tree: single-child dir chains merged, omitted files summarized as counts."""
    tree = {}
    for e in entries:
        node = tree
        parts = e.rel.split('/')
        for p in parts[:-1]:
            node = node.setdefault(p + '/', {})
        node[parts[-1]] = e

    def stats(node):
        k = o = 0
        for v in node.values():
            if isinstance(v, dict):
                a, b = stats(v)
                k, o = k + a, o + b
            elif v.status == 'omitted':
                o += 1
            else:
                k += 1
        return k, o

    lines = [root_name + '/']

    def render(node, ind):
        dirs = sorted(k for k, v in node.items() if isinstance(v, dict))
        files = sorted(k for k, v in node.items() if not isinstance(v, dict))
        for d in dirs:
            name, child = d, node[d]
            while len(child) == 1:
                (k, v), = child.items()
                if not isinstance(v, dict):
                    break
                name, child = name + k, v
            kept, om = stats(child)
            if not kept:
                lines.append(f'{ind}{name} ({om} files omitted)')
                continue
            lines.append(ind + name)
            render(child, ind + '  ')
        kept = [f for f in files if node[f].status != 'omitted']
        om = [f for f in files if node[f].status == 'omitted']
        for f in kept[:max_files]:
            lines.append(ind + f + (' [sig]' if node[f].status == 'skeleton' else ''))
        if len(kept) > max_files:
            lines.append(f'{ind}… +{len(kept) - max_files} files')
        if 0 < len(om) <= 4:
            lines.extend(f'{ind}{f} [omitted]' for f in om)
        elif om:
            lines.append(f'{ind}… +{len(om)} files omitted')

    render(tree, '  ')
    return '## Structure\n```\n' + '\n'.join(lines) + '\n```\n'


# ───────────────────────────── OUTPUT ─────────────────────────────


def fence_for(text):
    runs = re.findall(r'`{3,}', text)
    return '`' * (max(map(len, runs)) + 1 if runs else 3)


def file_section(e):
    t = e.text()
    f = fence_for(t)
    if e.uses_diff():
        return f'### {e.rel} · near-copy\n{f}diff\n{t}\n{f}\n'
    tag = ' · signatures only' if e.status == 'skeleton' else ''
    return f'### {e.rel}{tag}\n{f}{e.lang}\n{t}\n{f}\n'


def reading_guide(args, any_skel, any_omitted, redacted, any_diff=False):
    g = []
    if args.mode != 'full':
        g.append('comments' + ('' if args.keep_imports else ' and import/using/package lines') + ' are stripped')
    if args.mode == 'dense':
        g.append('layout is compressed (1-space indent, braces/attributes joined, short blocks on one line) — code is unchanged')
    if any_diff:
        g.append('`near-copy` files are shown as a diff (`-` line of the reference file, `+` line of this file) against the file named on their first line')
    if any_skel:
        g.append('files marked `[sig]` show signatures only: `{ … }` / `...` = body omitted')
    if any_omitted:
        g.append('`[omitted]` = exists in the project but left out (token budget)')
    if redacted:
        g.append('`***` = redacted secret')
    return ('> **How to read:** ' + '; '.join(g) + '.\n') if g else ''


def apply_budget(entries, budget, overhead):
    """Pass 1 (least important first): full → signatures; low-priority files with no signature form → omitted.
    Pass 2: signatures → omitted. Important files stay full as long as possible."""
    order = sorted(entries, key=lambda e: e.priority)
    # Pass 0 (huge repos): if even "everything as signatures" (~40%) can't fit, drop the least
    # important files first, so we don't compute signatures for files that will be dropped anyway.
    est = overhead + sum(e.t_head + int(e.t_base * 0.4) for e in order if e.status != 'omitted')
    for e in order:
        if est <= budget:
            break
        if e.status != 'omitted':
            est -= e.t_head + int(e.t_base * 0.4)
            e.status = 'omitted'
    total = overhead + sum(e.cost() for e in entries)
    for final_pass in (False, True):
        for e in order:
            if total <= budget:
                return
            if e.status == 'omitted':
                continue
            if not final_pass and (e.status == 'skeleton' or (not e.skel and e.priority >= 60)):
                continue  # small important files (entities, DTOs…) survive pass 1
            before = e.cost()
            e.status = 'skeleton' if (e.status == 'base' and e.skel) else 'omitted'
            total += e.cost() - before


def split_parts(head, sections, tail, limit, title):
    parts, cur, cur_t = [], head, count_tokens(head)
    for s in sections:
        st = count_tokens(s)
        if cur_t + st > limit and cur.strip():
            parts.append(cur)
            cur, cur_t = '', 0
        cur += s + '\n'
        cur_t += st
    cur += tail
    parts.append(cur)
    k = len(parts)
    if k == 1:
        return parts
    out = []
    for i, p in enumerate(parts, 1):
        hdr = f'<!-- {title} · part {i}/{k} -->\n' + ('' if i == 1 else f'# {title} — part {i}/{k} (continued)\n\n')
        out.append(hdr + p)
    return out

# ───────────────────────────── MAIN ─────────────────────────────


def render(part, all_entries, summary_only, skipped, args, root_name, redacted, part_no=0, nparts=1,
           label='', parts_index=''):
    """Build one Markdown output for a set of files (the whole project, or one part)."""
    overview = '' if args.no_overview else build_overview(all_entries + summary_only, part, args)
    if args.max_tokens:
        ov_t = count_tokens(overview + parts_index) + 250
        tree_t = 0 if args.no_tree else count_tokens(build_tree(part, root_name, args.tree_max_files))
        new_tree_t = tree_t
        for _ in range(5):   # tree size depends on what gets omitted -> iterate until it fits
            for e in part:
                e.status = 'skeleton' if (args.mode == 'skeleton' and e.skel) else 'base'
            apply_budget(part, args.max_tokens, ov_t + tree_t)
            new_tree_t = 0 if args.no_tree else count_tokens(build_tree(part, root_name, args.tree_max_files))
            total = ov_t + new_tree_t + sum(e.cost() for e in part)
            if total <= args.max_tokens and abs(new_tree_t - tree_t) < 0.05 * args.max_tokens:
                break
            tree_t = new_tree_t + max(0, total - args.max_tokens)
        apply_budget(part, args.max_tokens, ov_t + new_tree_t)

    kept = [e for e in part if e.status != 'omitted']
    if args.order == 'priority':
        kept.sort(key=lambda e: -e.priority)
    tree = '' if args.no_tree else build_tree(part, root_name, args.tree_max_files)
    sections = [file_section(e) for e in kept]
    any_skel = any(e.status == 'skeleton' for e in kept)
    any_diff = any(e.uses_diff() for e in kept)
    omitted = [e for e in part if e.status == 'omitted']

    title = f'# Project: {root_name}' + (f' — Part {part_no}/{nparts}: {label}' if part_no else '')
    intro = ''
    if part_no:
        intro = (f'> This file is **part {part_no} of {nparts}** of the same project. It contains the code of: '
                 f'**{label}**. The overview below describes this part; the list of parts shows where the rest lives.\n\n')
    body_head = (reading_guide(args, any_skel, bool(omitted), redacted, any_diff) + '\n' + intro
                 + (parts_index + '\n' if parts_index else '')
                 + overview + ('\n' if overview else '') + tree + '\n## Files\n\n')
    tail_items = []
    if omitted:
        tail_items.append(f'- omitted (budget): {len(omitted)} files — see `[omitted]` in Structure')
    if skipped.get('too large') and part_no in (0, 1):
        tail_items.append('- too large: ' + ', '.join(skipped['too large'][:15]))
    if skipped.get('secret') and part_no in (0, 1):
        tail_items.append(f'- secret files never included: {len(skipped["secret"])} (.env, keys…)')
    tail = ('## Not included\n' + '\n'.join(tail_items) + '\n') if tail_items else ''
    body = body_head + '\n'.join(sections) + tail
    tokens = count_tokens(body) + 30
    head = (f'{title}\n_llm_extractor v{VERSION} · {datetime.datetime.now():%Y-%m-%d %H:%M} · '
            f'{len(kept)} files · ~{tokens:,} tokens_\n\n')
    stats = {'kept': len(kept), 'omitted': len(omitted), 'skel': sum(e.status == 'skeleton' for e in kept),
             'diff': sum(e.uses_diff() for e in kept), 'tokens': tokens}
    return head + body, stats


def plan_parts(entries, n):
    """Split the project into n parts that each make sense on their own, for ANY stack:
    folders are split recursively (biggest first) until no folder is much bigger than total/n,
    then the folders, kept in path order so neighbours stay together, are cut into n contiguous
    parts with balanced sizes (linear partition)."""
    total = sum(e.cost() for e in entries) or 1
    target = total / n

    def size(es):
        return sum(e.cost() for e in es)

    def split(prefix, es):
        depth = prefix.count('/') + 1 if prefix else 0
        while True:
            buckets = defaultdict(list)
            for e in es:
                segs = e.rel.split('/')
                key = segs[depth] if len(segs) > depth + 1 else None
                buckets[key].append(e)
            subdirs = [k for k in buckets if k is not None]
            if len(subdirs) == 1 and None not in buckets:   # single child chain -> go deeper
                prefix = (prefix + '/' if prefix else '') + subdirs[0]
                depth += 1
                continue
            out = []
            for k in sorted(subdirs, key=str.lower):
                out.append(((prefix + '/' if prefix else '') + k, buckets[k]))
            if None in buckets:
                out.insert(0, ((prefix or '(root)') + ' (files)', buckets[None]))
            return out

    groups = [('', list(entries))]
    for _ in range(400):
        big = [g for g in groups if size(g[1]) > target * 0.35 and len({e.rel for e in g[1]}) > 1
               and not g[0].endswith(' (files)')]
        if not big or len(groups) > 60 * n:
            break
        g = max(big, key=lambda g: size(g[1]))
        i = groups.index(g)
        sub = split(g[0], g[1])
        if len(sub) <= 1:
            groups[i] = (g[0] + ' (files)', g[1])
            continue
        groups[i:i + 1] = sub
    groups.sort(key=lambda g: g[0].replace(' (files)', '').lower())

    # contiguous cut into n parts. Cost = imbalance + "how deep inside a module we cut":
    # cutting between two top-level folders is free, cutting inside a module is penalised,
    # so a part ends where a module ends whenever the sizes allow it.
    sizes = [size(g[1]) for g in groups]
    m = len(groups)
    n = min(n, m)
    pre = [0]
    for x in sizes:
        pre.append(pre[-1] + x)

    def segs(i):
        return groups[i][0].replace(' (files)', '').split('/')

    pen = [0.0] * (m + 1)   # pen[i] = cost of a cut just before group i
    for i in range(1, m):
        a, c = segs(i - 1), segs(i)
        k = 0
        while k < min(len(a), len(c)) and a[k] == c[k]:
            k += 1
        pen[i] = float(k)

    INF = float('inf')
    for cap in (1.5, 2.0, 3.0, INF):
        best = [[INF] * (m + 1) for _ in range(n + 1)]
        cut = [[0] * (m + 1) for _ in range(n + 1)]
        best[0][0] = 0.0
        for k in range(1, n + 1):
            for j in range(k, m + 1):
                for i in range(k - 1, j):
                    if best[k - 1][i] == INF:
                        continue
                    sz = pre[j] - pre[i]
                    if sz > cap * target:
                        continue
                    v = best[k - 1][i] + 3.0 * ((sz - target) / target) ** 2 + pen[i]
                    if v < best[k][j]:
                        best[k][j], cut[k][j] = v, i
        if best[n][m] < INF:
            break
    bounds, j = [], m
    for k in range(n, 0, -1):
        i = cut[k][j]
        bounds.append((i, j))
        j = i
    bounds.reverse()

    parts = []
    for i, j in bounds:
        gs = groups[i:j]
        names = [g[0].replace(' (files)', '') or '.' for g in gs]
        tops = list(dict.fromkeys(nm.split('/')[0] for nm in names))
        if len(tops) == 1 and len(names) > 1:
            label = f'{tops[0]} ({names[0].split("/")[-1]} … {names[-1].split("/")[-1]})'
        elif len(tops) == 1:
            label = names[0]
        else:
            label = ', '.join(tops[:6]) + (f' +{len(tops) - 6}' if len(tops) > 6 else '')
        parts.append((label, [e for g in gs for e in g[1]]))
    return parts


def parse_args():
    p = argparse.ArgumentParser(description=f'LLM Project Extractor v{VERSION} — projet → Markdown 9lil f tokens')
    p.add_argument('path', help="Chemin dyal l-projet (ex: ./backend)")
    p.add_argument('-o', '--output', default='context_for_llm.md', help='Fichier output')
    p.add_argument('-d', '--domain', help='Mots-clés (séparés b virgule): ex blog,auth')
    p.add_argument('--domain-content', action='store_true', help="Domain y-matchi 7ta f contenu dyal l-fichier, machi ghir l-path")
    p.add_argument('-r', '--related', type=int, default=1, help='Profondeur dyal fichiers lié (imports) m3a --domain (0 = la)')
    p.add_argument('-m', '--mode', choices=['compact', 'dense', 'full', 'skeleton'], default='compact',
                   help='compact (default): bla commentaires · dense: compact + layout mdghot + near-copies b diff '
                        '(nefs l-code, tokens 9lal) · full: code kima howa · skeleton: ghir signatures')
    p.add_argument('-p', '--parts', type=int, default=0,
                   help='9sem l-projet l N fichiers mfhoumin (kol part = partie dyal l-code + carte globale)')
    p.add_argument('-t', '--max-tokens', type=int, default=0, help='Budget dyal tokens (0 = bla limite)')
    p.add_argument('--split', type=int, default=0, help='9sem l-output l parts, kol part max N tokens')
    p.add_argument('-i', '--include', action='append', default=[], help='Glob: ghir had l-fichiers (ex: "*.java")')
    p.add_argument('-x', '--exclude', action='append', default=[], help='Glob: 7iyed (ex: "src/test/*")')
    p.add_argument('--max-file-kb', type=int, default=150, help='Skip fichiers kbar mn had l-7ajm (KB)')
    p.add_argument('--keep-imports', action='store_true', help='Khelli imports dyal Java/Kotlin')
    p.add_argument('--order', choices=['path', 'priority'], default='path', help='Tartib dyal fichiers f output')
    p.add_argument('--tree-max-files', type=int, default=40, help='Max fichiers kayban f kol dossier f tree')
    p.add_argument('--xaml', action='store_true', help='Dkhel fichiers .xaml (UI markup, kaykelo bzaf d tokens)')
    p.add_argument('--include-archives', action='store_true', help="Dkhel dossiers archive/caduc/old/backup (par défaut ma kaydkhlouch)")
    p.add_argument('--no-gitignore', action='store_true')
    p.add_argument('--no-overview', action='store_true')
    p.add_argument('--no-tree', action='store_true')
    p.add_argument('--dry-run', action='store_true', help='Werrini chno ghaydkhol bla ma nkteb walo')
    a = p.parse_args()
    a.domain = [d.strip().lower() for d in a.domain.split(',') if d.strip()] if a.domain else None
    return a


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    args = parse_args()
    root = os.path.abspath(args.path)
    if not os.path.isdir(root):
        print(f"❌ L'path '{root}' makaynch.")
        return 1
    out_abs = os.path.abspath(args.output)
    out_stem = os.path.splitext(os.path.basename(out_abs))[0]
    root_name = os.path.basename(root.rstrip(os.sep)) or root

    print(f'🚀 Kan-scanni: {root}')
    found, skipped = scan(root, args, out_abs, out_stem)

    entries, redacted, seen = [], 0, {}
    for rel, full, (lang, fam) in found:
        raw = read_text(full)
        if raw is None or not raw.strip():
            skipped['unreadable/empty'].append(rel)
            continue
        if fam == 'xml' and DOTNET_XMLDOC_RE.match(raw[:400]):
            skipped['vendor xml docs'].append(rel)   # Telerik.*.xml, Newtonsoft.Json.xml…
            continue
        h = hashlib.md5(raw.encode('utf-8', 'ignore')).hexdigest()
        if h in seen:
            skipped['duplicate'].append(f'{rel} = {seen[h]}')
            continue
        seen[h] = rel
        raw, n = redact(raw, fam)
        redacted += n
        entries.append(Entry(rel, raw, lang, fam))

    summary_only = [e for e in entries if e.ext in SUMMARY_ONLY_EXTS]
    entries = [e for e in entries if e.ext not in SUMMARY_ONLY_EXTS]

    if args.domain:
        keys = domain_keys(entries)
        for e in entries:
            hay = keys[e.rel] + ('\n' + e.raw.lower() if args.domain_content else '')
            e.direct = any(k in hay for k in args.domain)
        emap = {e.rel: e for e in entries}
        by_stem, paths, roots = build_index(entries)
        frontier = [e.rel for e in entries if e.direct]
        selected = set(frontier)
        for _ in range(max(0, args.related)):
            nxt = []
            for rel in frontier:
                for dep in deps_of(emap[rel], by_stem, paths, roots):
                    if dep not in selected:
                        selected.add(dep)
                        emap[dep].related = True
                        nxt.append(dep)
            frontier = nxt
        included = [e for e in entries if e.rel in selected]
        print(f'🔍 Domain {args.domain}: {sum(e.direct for e in included)} direct + '
              f'{sum(e.related for e in included)} related')
    else:
        included = entries

    if not included:
        print('❌ 7ta fichier ma tla9a m3a had l-filtres.')
        return 1

    for e in included:
        e.prepare(args.mode, args.keep_imports)

    if args.parts and args.parts > 1:
        groups = plan_parts(included, args.parts)
    else:
        groups = [('', included)]
    if args.mode == 'dense':
        for _, part in groups:
            mark_near_duplicates(part)

    parts_index = ''
    if len(groups) > 1:
        rows = [f'- **Part {i}** — {label}: {len(p)} files, ~{sum(e.cost() for e in p):,} tokens'
                for i, (label, p) in enumerate(groups, 1)]
        parts_index = '## Parts of this export\n' + '\n'.join(rows) + '\n'

    redacted_note = redacted
    outputs, report = [], []
    for i, (label, part) in enumerate(groups, 1):
        text, st = render(part, entries, summary_only, skipped, args, root_name, redacted_note,
                          part_no=i if len(groups) > 1 else 0, nparts=len(groups), label=label, parts_index=parts_index)
        outputs.append(text)
        report.append(st)

    # ── console report
    nskip = sum(len(v) for v in skipped.values())
    kept_n = sum(r['kept'] for r in report)
    omitted_n = sum(r['omitted'] for r in report)
    skel_n = sum(r['skel'] for r in report)
    diff_n = sum(r['diff'] for r in report)
    print(f'📁 {len(found) + nskip} fichier tla9aw · {kept_n} dkhlo'
          + (f' ({skel_n} signatures only)' if skel_n else '')
          + (f' · {diff_n} near-copies b diff' if diff_n else '')
          + (f' · {omitted_n} omitted (budget)' if omitted_n else ''))
    if skipped:
        print('   skipped: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(skipped.items(), key=lambda x: -len(x[1]))))
    if redacted:
        print(f'🔒 {redacted} secret(s) tredactaw (***)')
    raw_tok = sum(e.t_raw for e in included)
    code_tok = sum(e.cost() - e.t_head for e in included if e.status != 'omitted')
    total_tok = sum(r['tokens'] for r in report)
    saved = (1 - code_tok / raw_tok) * 100 if raw_tok else 0
    print(f'🧠 ~{total_tok:,} tokens total · code: {raw_tok:,} → {code_tok:,}' + (f' (-{saved:.1f}%)' if saved > 0 else ''))
    if _ENC is False:
        print('   (tokens ta9ribiyin: pip install tiktoken bach yt7sbo b dbt)')
    kept = [e for e in included if e.status != 'omitted']
    top = sorted(kept, key=lambda e: -e.cost())[:5]
    print('📊 Top fichiers li kaykelo tokens: ' + ', '.join(f'{e.name} ({e.cost():,})' for e in top))

    if args.dry_run:
        if len(groups) > 1:
            print('\n' + parts_index.replace('**', ''))
        print('\n   tokens  prio  status    file')
        for e in sorted(included, key=lambda e: -e.priority):
            st = 'diff' if e.uses_diff() else e.status
            print(f'  {e.cost():>7,}  {e.priority:>4}  {st:<9} {e.rel}')
        print('\n(dry-run: ma tkteb 7ta fichier)')
        return 0

    base, ext = os.path.splitext(out_abs)
    files_out = []
    for i, (text, (label, _)) in enumerate(zip(outputs, groups), 1):
        if len(groups) > 1:
            slug = re.sub(r'[^\w.-]+', '_', label)[:60].strip('_')
            path = f'{base}.part{i}_{slug}{ext}'
        else:
            path = out_abs
        if args.split and len(groups) == 1:
            break
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
        files_out.append((path, count_tokens(text)))
    if args.split and len(groups) == 1:
        head_end = outputs[0].index('\n## Files\n\n') + len('\n## Files\n\n')
        secs = [s_ for s_ in re.split(r'(?m)^(?=### )', outputs[0][head_end:]) if s_.strip()]
        tail = ''
        if secs and '\n## Not included' in secs[-1]:
            last, tail = secs[-1].split('\n## Not included', 1)
            secs[-1], tail = last, '\n## Not included' + tail
        chunks = split_parts(outputs[0][:head_end], secs, tail, args.split, root_name)
        for i, c in enumerate(chunks, 1):
            path = f'{base}.part{i}{ext}' if len(chunks) > 1 else out_abs
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(c)
            files_out.append((path, count_tokens(c)))
    for path, t in files_out:
        print(f"✅ {os.path.basename(path)}  (~{t:,} tokens)")
    if not args.max_tokens and max(t for _, t in files_out) > 200_000:
        print('💡 Fichier kbir l ba3d l-models: zid --parts, -m dense, -t 150000 (budget l kol part) awla -d <domain>')
    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)