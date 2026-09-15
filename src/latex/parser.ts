import { parse } from '@unified-latex/unified-latex-util-parse';
import { printRaw } from '@unified-latex/unified-latex-util-print-raw';
import { visit } from '@unified-latex/unified-latex-util-visit';
import * as Ast from '@unified-latex/unified-latex-types';

export interface ExtractedSection {
  title: string;
  level: 'section' | 'subsection' | 'subsubsection' | 'chapter' | 'paragraph';
  index: number;
}

export interface ExtractedEnvironment {
  name: string;
  content: string;
}

export interface ExtractedCitation {
  keys: string[];
  macro: string;
}

export interface ExtractedLabel {
  name: string;
}

export interface ExtractedRef {
  target: string;
  macro: string;
}

export interface ParsedLatexDocument {
  ast: Ast.Root;
  documentClass?: string;
  packages: string[];
  sections: ExtractedSection[];
  environments: ExtractedEnvironment[];
  citations: ExtractedCitation[];
  labels: ExtractedLabel[];
  refs: ExtractedRef[];
}

/**
 * Extracts plain text from an array of unified-latex AST nodes or arguments
 */
export function extractTextFromNodes(nodes: Ast.Node[] | undefined): string {
  if (!nodes || nodes.length === 0) return '';
  return printRaw(nodes).trim();
}

/**
 * Parses LaTeX source into a structured representation with extracted metadata.
 */
export function parseLatex(source: string): ParsedLatexDocument {
  const ast = parse(source);

  let documentClass: string | undefined;
  const packages: string[] = [];
  const sections: ExtractedSection[] = [];
  const environments: ExtractedEnvironment[] = [];
  const citations: ExtractedCitation[] = [];
  const labels: ExtractedLabel[] = [];
  const refs: ExtractedRef[] = [];

  let sectionCounter = 0;

  visit(ast, (node) => {
    if (node.type === 'macro') {
      const name = node.content;

      if (name === 'documentclass' && node.args && node.args.length > 0) {
        // Last argument is the class name
        const classArg = node.args[node.args.length - 1];
        if (classArg && classArg.content) {
          documentClass = extractTextFromNodes(classArg.content);
        }
      } else if (name === 'usepackage' && node.args && node.args.length > 0) {
        const pkgArg = node.args[node.args.length - 1];
        if (pkgArg && pkgArg.content) {
          const pkgList = extractTextFromNodes(pkgArg.content)
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
          packages.push(...pkgList);
        }
      } else if (
        ['section', 'subsection', 'subsubsection', 'chapter', 'paragraph'].includes(name)
      ) {
        const titleArg = node.args?.[node.args.length - 1];
        const title = titleArg ? extractTextFromNodes(titleArg.content) : '';
        sections.push({
          title,
          level: name as ExtractedSection['level'],
          index: sectionCounter++,
        });
      } else if (['cite', 'citep', 'citet', 'autocite', 'nocite'].includes(name)) {
        const keyArg = node.args?.[node.args.length - 1];
        const rawKeys = keyArg ? extractTextFromNodes(keyArg.content) : '';
        const keys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
        citations.push({ keys, macro: name });
      } else if (name === 'label') {
        const labelArg =
          node.args?.find((a) => a.openMark === '{') ||
          node.args?.[node.args.length - 1];
        const labelName = labelArg ? extractTextFromNodes(labelArg.content) : '';
        if (labelName) {
          labels.push({ name: labelName });
        }
      } else if (['ref', 'eqref', 'autoref', 'cref', 'Cref', 'pageref'].includes(name)) {
        const refArg =
          node.args?.find((a) => a.openMark === '{') ||
          node.args?.[node.args.length - 1];
        const target = refArg ? extractTextFromNodes(refArg.content) : '';
        if (target) {
          refs.push({ target, macro: name });
        }
      }
    } else if (node.type === 'environment') {
      const envName = typeof node.env === 'string' ? node.env : printRaw(node.env);
      environments.push({
        name: envName,
        content: printRaw(node.content),
      });
    }
  });

  return {
    ast,
    documentClass,
    packages,
    sections,
    environments,
    citations,
    labels,
    refs,
  };
}
