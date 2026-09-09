import ts from "typescript";

import { lineAt, normalizeProjectPath } from "./paths.ts";
import type { AnalysisDiagnostic, ExportFact, ModuleEdgeFact, ModuleFacts, SourceInput } from "./types.ts";

const supportedExtensions = /\.(?:[cm]?[jt]sx?)$/i;

export function isSupportedModule(filePath: string) {
  return supportedExtensions.test(filePath);
}

export function extractModuleFacts(input: SourceInput): ModuleFacts {
  const filePath = normalizeProjectPath(input.path);
  const scriptKind = scriptKindFor(filePath);
  const sourceFile = ts.createSourceFile(filePath, input.content, ts.ScriptTarget.Latest, true, scriptKind);
  const edges: ModuleEdgeFact[] = [];
  const exports: ExportFact[] = [];
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
    bindings: ModuleEdgeFact["bindings"] = [],
  ) => {
    const literal = expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
      ? expression.text
      : null;
    edges.push({
      specifier: literal,
      kind,
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      isLiteral: literal !== null,
      bindings,
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
      addLiteralEdge(node, node.moduleSpecifier, typeOnly ? "type-import" : "static-import", importBindings(node.importClause));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      addLiteralEdge(node, node.moduleSpecifier, "re-export", reExportBindings(node.exportClause));
    } else if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exports.push({ name: element.name.text, line: sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile)).line + 1, kind: element.isTypeOnly ? "type" : "value" });
      }
    } else if (hasExportModifier(node)) {
      collectDeclarationExports(node, sourceFile, exports);
    } else if (ts.isExportAssignment(node)) {
      exports.push({ name: "default", line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1, kind: "default" });
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addLiteralEdge(node, node.arguments[0], "dynamic-import", [{ imported: "*" }]);
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        addLiteralEdge(node, node.arguments[0], "commonjs-require", [{ imported: "*" }]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return {
    path: filePath,
    edges,
    exports: dedupeExports(exports),
    parseComplete: diagnostics.every((diagnostic) => diagnostic.code !== "parse-error"),
    generated: /(?:^|\/)(?:generated|__generated__)(?:\/|$)|\.generated\.[cm]?[jt]sx?$/i.test(filePath),
    diagnostics,
  };
}

function importBindings(clause: ts.ImportClause | undefined): ModuleEdgeFact["bindings"] {
  if (!clause) return [];
  const bindings: ModuleEdgeFact["bindings"] = [];
  if (clause.name) bindings.push({ imported: "default" });
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) bindings.push({ imported: "*" });
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) bindings.push({ imported: element.propertyName?.text ?? element.name.text });
  }
  return bindings;
}

function reExportBindings(clause: ts.NamedExportBindings | undefined): ModuleEdgeFact["bindings"] {
  if (!clause) return [{ imported: "*", exposedAs: "*" }];
  if (ts.isNamespaceExport(clause)) return [{ imported: "*", exposedAs: clause.name.text }];
  return clause.elements.map((element) => ({ imported: element.propertyName?.text ?? element.name.text, exposedAs: element.name.text }));
}

function hasExportModifier(node: ts.Node) {
  return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function collectDeclarationExports(node: ts.Node, sourceFile: ts.SourceFile, exports: ExportFact[]) {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const isDefault = ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
  if (isDefault) {
    exports.push({ name: "default", line, kind: "default" });
    return;
  }
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) collectBindingNames(declaration.name, line, exports);
  } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) {
    exports.push({ name: node.name.text, line, kind: ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ? "type" : "value" });
  }
}

function collectBindingNames(name: ts.BindingName, line: number, exports: ExportFact[]) {
  if (ts.isIdentifier(name)) exports.push({ name: name.text, line, kind: "value" });
  else for (const element of name.elements) if (!ts.isOmittedExpression(element)) collectBindingNames(element.name, line, exports);
}

function dedupeExports(exports: ExportFact[]) {
  const seen = new Set<string>();
  return exports.filter((item) => {
    const key = `${item.name}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

function scriptKindFor(filePath: string) {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  if (/\.jsx$/i.test(filePath)) return ts.ScriptKind.JSX;
  if (/\.[cm]?ts$/i.test(filePath)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}
