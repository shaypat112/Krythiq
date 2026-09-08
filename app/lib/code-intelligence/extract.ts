import ts from "typescript";

import { lineAt, normalizeProjectPath } from "./paths.ts";
import type { AnalysisDiagnostic, ModuleEdgeFact, ModuleFacts, SourceInput } from "./types.ts";

const supportedExtensions = /\.(?:[cm]?[jt]sx?)$/i;

export function isSupportedModule(filePath: string) {
  return supportedExtensions.test(filePath);
}

export function extractModuleFacts(input: SourceInput): ModuleFacts {
  const filePath = normalizeProjectPath(input.path);
  const scriptKind = scriptKindFor(filePath);
  const sourceFile = ts.createSourceFile(filePath, input.content, ts.ScriptTarget.Latest, true, scriptKind);
  const edges: ModuleEdgeFact[] = [];
  const parseDiagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
  const diagnostics: AnalysisDiagnostic[] = parseDiagnostics.map((diagnostic) => ({
    code: "parse-error",
    file: filePath,
    line: lineAt(input.content, diagnostic.start ?? 0),
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  }));

  const addLiteralEdge = (
    node: ts.Node,
    expression: ts.Expression | undefined,
    kind: ModuleEdgeFact["kind"],
  ) => {
    const literal = expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
      ? expression.text
      : null;
    edges.push({
      specifier: literal,
      kind,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      isLiteral: literal !== null,
    });
    if (literal === null && kind === "dynamic-import") {
      diagnostics.push({
        code: "unknown-dynamic-import",
        file: filePath,
        line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        message: "Dynamic import target is not a static string literal.",
      });
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const typeOnly = node.importClause?.isTypeOnly === true ||
        (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
          node.importClause.namedBindings.elements.length > 0 &&
          node.importClause.namedBindings.elements.every((element) => element.isTypeOnly));
      addLiteralEdge(node, node.moduleSpecifier, typeOnly ? "type-import" : "static-import");
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      addLiteralEdge(node, node.moduleSpecifier, "re-export");
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addLiteralEdge(node, node.arguments[0], "dynamic-import");
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        addLiteralEdge(node, node.arguments[0], "commonjs-require");
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return {
    path: filePath,
    edges,
    parseComplete: diagnostics.every((diagnostic) => diagnostic.code !== "parse-error"),
    generated: /(?:^|\/)(?:generated|__generated__)(?:\/|$)|\.generated\.[cm]?[jt]sx?$/i.test(filePath),
    diagnostics,
  };
}

function scriptKindFor(filePath: string) {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(filePath)) return ts.ScriptKind.JSX;
  if (/\.[cm]?ts$/i.test(filePath)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}
