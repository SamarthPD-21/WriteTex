import { describe, expect, it } from 'vitest';
import { invertPlan, planEdit, rebasePlan } from '../src/diff/edit-plan';

const doc = `\\begin{document}
\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading
    {Globex Corp}{May 2020 -- May 2022}
    {Backend Intern}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Wrote REST endpoints for the billing service in Go}
      \\resumeItem{Added integration tests for the invoicing pipeline}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd
\\end{document}`;

const applyAt = (text: string, from: number, to: number, insert: string) => text.slice(0, from) + insert + text.slice(to);

describe('Edit plans', () => {
  it('plans a selection edit and keeps its surrounding whitespace', () => {
    const text = '      \\resumeItem{Wrote REST endpoints for the billing service in Go}\n';
    const from = doc.indexOf(text);
    const plan = planEdit(doc, '\\resumeItem{Engineered billing REST APIs in Go}', {
      fileName: 'resume.tex',
      selection: { from, to: from + text.length, text },
    })!;
    expect(plan.reason).toBe('selection');
    expect(plan.newText).toBe('      \\resumeItem{Engineered billing REST APIs in Go}\n');
    expect(plan.startLine).toBe(8);
  });

  it('describes where a located edit lands', () => {
    const plan = planEdit(doc, '\\resumeItem{Wrote REST APIs for the billing service in Go, cutting latency}', { fileName: 'r.tex' })!;
    expect(plan.reason).toBe('bullet_match');
    expect(plan.description).toBe('Rewrites 1 bullet in “Experience”');
    const entry = planEdit(doc, '\\resumeSubheading\n    {Globex Corp}{May 2020 -- May 2022}\n    {Backend Engineer}{Remote}', { fileName: 'r.tex' })!;
    expect(entry.description).toBe('Updates 1 entry: “Globex Corp”');
  });

  it('rebases onto a document edited above the target', () => {
    const plan = planEdit(doc, '\\resumeItem{Added integration tests for the invoicing pipeline, catching 12 regressions}', { fileName: 'r.tex' })!;
    const edited = '% new comment\n' + doc;
    const target = rebasePlan(edited, plan)!;
    expect(edited.slice(target.from, target.to)).toBe(plan.originalText);
    expect(target.from).toBe(plan.from + '% new comment\n'.length);
  });

  it('refuses to rebase when the user changed the target text', () => {
    const plan = planEdit(doc, '\\resumeItem{Added integration tests for the invoicing pipeline, catching 12 regressions}', { fileName: 'r.tex' })!;
    const edited = doc.replace('invoicing pipeline', 'payments pipeline');
    expect(rebasePlan(edited, plan)).toBeNull();
  });

  it('undoes an applied plan even after unrelated edits', () => {
    const plan = planEdit(doc, '\\resumeItem{Wrote REST endpoints for the billing service in Go and Rust}', { fileName: 'r.tex' })!;
    const applied = applyAt(doc, plan.from, plan.to, plan.newText);
    const undo = invertPlan(plan, plan.from);
    const shifted = '% x\n' + applied;
    const target = rebasePlan(shifted, undo)!;
    expect(applyAt(shifted, target.from, target.to, undo.newText)).toBe('% x\n' + doc);
  });
});
