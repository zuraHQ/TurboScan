import fs from "fs";
import path from "path";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
import Rust from "tree-sitter-rust";
import Java from "tree-sitter-java";
import CSharp from "tree-sitter-c-sharp";
import Ruby from "tree-sitter-ruby";
import Cpp from "tree-sitter-cpp";

const EXCLUDE = ["node_modules", ".git", "dist", "build", ".next", "coverage", ".cursor", ".bun"];

// Cache: parsed symbols per repo, with TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const symbolCache = new Map<string, { symbols: CodeSymbol[]; timestamp: number }>();

function getCachedSymbols(dir: string): CodeSymbol[] | null {
  const entry = symbolCache.get(dir);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.symbols;
  return null;
}

function setCachedSymbols(dir: string, symbols: CodeSymbol[]): void {
  symbolCache.set(dir, { symbols, timestamp: Date.now() });
}

export function invalidateCache(dir: string): void {
  symbolCache.delete(dir);
}

// Map file extensions to tree-sitter language grammars
const LANGUAGE_MAP: Record<string, any> = {
  ".js": JavaScript,
  ".jsx": JavaScript,
  ".mjs": JavaScript,
  ".cjs": JavaScript,
  ".ts": TypeScript.typescript,
  ".tsx": TypeScript.tsx,
  ".py": Python,
  ".go": Go,
  ".rs": Rust,
  ".java": Java,
  ".cs": CSharp,
  ".rb": Ruby,
  ".cpp": Cpp,
  ".cc": Cpp,
  ".cxx": Cpp,
  ".hpp": Cpp,
  ".h": Cpp,
  ".c": Cpp,
};

export type SymbolKind = "function" | "class" | "method" | "interface" | "type" | "import" | "export" | "variable";

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  file: string;
  startLine: number;
  endLine: number;
  signature: string;
  parent?: string; // class/interface this belongs to
}

// Tree-sitter node types that map to each symbol kind, per language family
const QUERY_NODE_TYPES: Record<SymbolKind, string[]> = {
  function: [
    "function_declaration",
    "function_definition",
    "arrow_function",
    "method_definition",
    "function_item",         // Rust
    "method_declaration",    // Java/C#
  ],
  class: [
    "class_declaration",
    "class_definition",      // Python
    "struct_item",           // Rust
    "impl_item",            // Rust
  ],
  method: [
    "method_definition",
    "method_declaration",
    "function_item",
  ],
  interface: [
    "interface_declaration",
    "type_alias_declaration",
    "trait_item",            // Rust
  ],
  type: [
    "type_alias_declaration",
    "type_annotation",
  ],
  import: [
    "import_statement",
    "import_declaration",
    "use_declaration",       // Rust
    "import_from_statement", // Python
  ],
  export: [
    "export_statement",
    "export_declaration",
  ],
  variable: [
    "variable_declaration",
    "lexical_declaration",
    "const_declaration",
    "variable_declarator",
    "let_declaration",       // Rust
    "static_item",           // Rust
  ],
};

function getLanguage(filePath: string): any | null {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || null;
}

function extractName(node: Parser.SyntaxNode): string {
  // Try common child field names for identifiers
  const nameNode =
    node.childForFieldName("name") ||
    node.childForFieldName("declarator") ||
    node.children.find((c) => c.type === "identifier" || c.type === "type_identifier" || c.type === "property_identifier");

  if (nameNode) {
    // For declarators that wrap an identifier
    if (nameNode.type === "variable_declarator") {
      const inner = nameNode.childForFieldName("name");
      return inner?.text || nameNode.text.split(/[\s=({]/)[0]!;
    }
    return nameNode.text;
  }

  // For arrow functions assigned to variables: const foo = () => {}
  if (node.parent?.type === "variable_declarator") {
    const varName = node.parent.childForFieldName("name");
    if (varName) return varName.text;
  }

  // For exports: export function foo / export default
  if (node.type === "export_statement") {
    const decl = node.children.find((c) =>
      c.type.includes("declaration") || c.type.includes("function") || c.type.includes("class")
    );
    if (decl) return extractName(decl);
    return "(default export)";
  }

  return "(anonymous)";
}

function extractSignature(node: Parser.SyntaxNode, sourceCode: string): string {
  // Get first line of the node, trimmed
  const startIdx = node.startIndex;
  const endOfFirstLine = sourceCode.indexOf("\n", startIdx);
  const firstLine = sourceCode.slice(startIdx, endOfFirstLine === -1 ? node.endIndex : endOfFirstLine).trim();

  // Truncate long signatures
  if (firstLine.length > 200) return firstLine.slice(0, 200) + "...";
  return firstLine;
}

function findParentClass(node: Parser.SyntaxNode): string | undefined {
  let current = node.parent;
  while (current) {
    if (
      current.type === "class_declaration" ||
      current.type === "class_definition" ||
      current.type === "impl_item" ||
      current.type === "interface_declaration"
    ) {
      return extractName(current);
    }
    current = current.parent;
  }
  return undefined;
}

function determineKind(nodeType: string, node: Parser.SyntaxNode): SymbolKind {
  // Methods inside classes
  if (
    (nodeType === "method_definition" || nodeType === "method_declaration") ||
    (nodeType === "function_declaration" && findParentClass(node))
  ) {
    return "method";
  }

  for (const [kind, types] of Object.entries(QUERY_NODE_TYPES)) {
    if (types.includes(nodeType)) return kind as SymbolKind;
  }
  return "function";
}

function walkTree(node: Parser.SyntaxNode, filePath: string, sourceCode: string, symbols: CodeSymbol[]): void {
  const allTypes = Object.values(QUERY_NODE_TYPES).flat();

  if (allTypes.includes(node.type)) {
    const kind = determineKind(node.type, node);
    const name = extractName(node);

    // Skip anonymous or trivial nodes
    if (name !== "(anonymous)" || kind === "import" || kind === "export") {
      symbols.push({
        name,
        kind,
        file: filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        signature: extractSignature(node, sourceCode),
        parent: kind === "method" ? findParentClass(node) : undefined,
      });
    }

    // Don't recurse into function/class bodies for top-level scan
    // But DO recurse into classes to find methods
    if (kind === "class" || kind === "interface") {
      for (const child of node.children) {
        walkTree(child, filePath, sourceCode, symbols);
      }
      return;
    }

    // For arrow functions assigned to vars, we already captured it — skip children
    if (node.type === "arrow_function") return;
  }

  // Recurse into children
  for (const child of node.children) {
    walkTree(child, filePath, sourceCode, symbols);
  }
}

/** Parse a single file and extract all code symbols */
export function parseFile(filePath: string): CodeSymbol[] {
  const language = getLanguage(filePath);
  if (!language) return [];

  let sourceCode: string;
  try {
    sourceCode = fs.readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  // Skip very large files (>1MB) — likely generated
  if (sourceCode.length > 1_000_000) return [];

  const parser = new Parser();
  parser.setLanguage(language);

  const tree = parser.parse(sourceCode);
  const symbols: CodeSymbol[] = [];
  walkTree(tree.rootNode, filePath, sourceCode, symbols);

  return symbols;
}

/** Parse all supported files in a directory recursively (cached) */
export function parseDirectory(dir: string): CodeSymbol[] {
  const cached = getCachedSymbols(dir);
  if (cached) return cached;

  const symbols: CodeSymbol[] = [];

  function scan(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (EXCLUDE.includes(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (getLanguage(fullPath)) {
        symbols.push(...parseFile(fullPath));
      }
    }
  }

  scan(dir);
  setCachedSymbols(dir, symbols);
  return symbols;
}

/** Get a structured summary of a codebase: classes, their methods, standalone functions, etc. */
export function getCodeStructure(dir: string): {
  classes: { name: string; file: string; methods: string[]; startLine: number; endLine: number }[];
  functions: CodeSymbol[];
  interfaces: CodeSymbol[];
  imports: { file: string; statements: string[] }[];
  totalSymbols: number;
} {
  const symbols = parseDirectory(dir);

  const classes = symbols
    .filter((s) => s.kind === "class")
    .map((cls) => ({
      name: cls.name,
      file: cls.file,
      startLine: cls.startLine,
      endLine: cls.endLine,
      methods: symbols
        .filter((s) => s.kind === "method" && s.parent === cls.name && s.file === cls.file)
        .map((m) => m.signature),
    }));

  const functions = symbols.filter((s) => s.kind === "function" && !s.parent);
  const interfaces = symbols.filter((s) => s.kind === "interface");

  // Group imports by file
  const importMap = new Map<string, string[]>();
  for (const s of symbols.filter((s) => s.kind === "import")) {
    const existing = importMap.get(s.file) || [];
    existing.push(s.signature);
    importMap.set(s.file, existing);
  }
  const imports = Array.from(importMap.entries()).map(([file, statements]) => ({ file, statements }));

  return {
    classes,
    functions,
    interfaces,
    imports,
    totalSymbols: symbols.length,
  };
}

/** Find a specific symbol by name across the codebase */
export function findSymbol(dir: string, name: string): CodeSymbol[] {
  const symbols = parseDirectory(dir);
  const lower = name.toLowerCase();
  return symbols.filter((s) => s.name.toLowerCase().includes(lower));
}

/** Get the dependency graph: which files import what */
export function getDependencyGraph(dir: string): Record<string, string[]> {
  const symbols = parseDirectory(dir);
  const graph: Record<string, string[]> = {};

  for (const s of symbols.filter((s) => s.kind === "import")) {
    const relativePath = path.relative(dir, s.file);
    if (!graph[relativePath]) graph[relativePath] = [];
    graph[relativePath]!.push(s.signature);
  }

  return graph;
}
