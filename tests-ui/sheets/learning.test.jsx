import {describe, it, expect, beforeEach, vi} from 'vitest';
import {screen, within, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {LEARN} from '@data/learn.js';
import {QUESTIONS, useGame} from '@/store/index.js';
import {ConceptSheet, conceptFor, conceptTitle} from '@/features/sheets/ConceptSheet.jsx';
import {QuizSheet} from '@/features/sheets/QuizSheet.jsx';
import {HelpSheet} from '@/features/sheets/HelpSheet.jsx';
import {wrap, acts, resetStore} from './helpers.jsx';

beforeEach(() => resetStore());

describe('concept cards', () => {
  it('shows plain words, why it matters and a try-this for a topic', () => {
    wrap(<ConceptSheet topic="eclipse" />);
    for (const h of ['In plain words', 'Why it changes your mission', 'Try this']) expect(screen.getByRole('heading', {name: h})).toBeTruthy();
    expect(screen.getByText(LEARN.eclipse.simple)).toBeTruthy();
    expect(conceptTitle({topic: 'eclipse'})).toBe(LEARN.eclipse.title);
  });
  it('the index lists every card and opens one through the learn action', async () => {
    const learn = vi.spyOn(acts(), 'learn').mockImplementation(() => {});
    wrap(<ConceptSheet index />);
    expect(screen.getAllByRole('button')).toHaveLength(Object.keys(LEARN).length);
    await userEvent.setup().click(screen.getByRole('button', {name: new RegExp(LEARN.power.title)}));
    expect(learn).toHaveBeenCalledWith({topic: 'power'});
  });
  it('prototype keys and unknown topics are not concepts: the index is shown with a note', () => {
    for (const bad of ['__proto__', 'constructor', 'toString', 'nope', undefined, 7]) expect(conceptFor(bad)).toBeNull();
    wrap(<ConceptSheet topic="__proto__" />);
    expect(screen.getByRole('status').textContent).toMatch(/does not exist/);
    expect(conceptTitle({topic: '__proto__'})).toBe('Concept cards');
  });
});

describe('learning check', () => {
  it('offers a start button when no check is under way', async () => {
    wrap(<QuizSheet close={() => {}} />);
    await userEvent.setup().click(screen.getByRole('button', {name: 'Start the 3-question check'}));
    expect(useGame.getState().quiz).toEqual({i: 0, answers: []});
  });
  it('walks the three questions, locks answers, explains and summarises', async () => {
    const user = userEvent.setup();
    acts().quiz();
    wrap(<QuizSheet close={() => {}} />);
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      const options = within(screen.getByRole('radiogroup')).getAllByRole('radio');
      expect(options).toHaveLength(q.opts.length);
      await user.click(options[q.answer]);
      expect(useGame.getState().quiz.answers[i]).toBe(q.answer);
      await user.click(options[(q.answer + 1) % options.length]); // locked: no change
      expect(useGame.getState().quiz.answers[i]).toBe(q.answer);
      expect(screen.getByRole('status').textContent).toContain(q.why);
      if (i < QUESTIONS.length - 1) await user.click(screen.getByRole('button', {name: 'Next question'}));
    }
    expect(screen.getByText(/3 \/ 3 correct/)).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Finish'})).toBeTruthy();
  });
  it('wrong answers are marked with words, not colour alone', async () => {
    acts().quiz();
    wrap(<QuizSheet close={() => {}} />);
    const q = QUESTIONS[0], wrong = (q.answer + 1) % q.opts.length;
    await userEvent.setup().click(screen.getAllByRole('radio')[wrong]);
    expect(screen.getByText('Your answer, not correct')).toBeTruthy(); expect(screen.getByText('Correct answer')).toBeTruthy(); expect(screen.getByText('Not quite')).toBeTruthy();
  });
});

describe('help', () => {
  it('has the four steps, the controls and shortcuts to the learning tools', async () => {
    const mentor = vi.spyOn(acts(), 'mentor').mockImplementation(() => {}), quiz = vi.spyOn(acts(), 'quiz').mockImplementation(() => {});
    wrap(<HelpSheet />);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('heading', {name: 'Controls'})).toBeTruthy(); expect(screen.getByText(/Escape closes a panel/)).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: 'Ask the assistant'})); await user.click(screen.getByRole('button', {name: 'Learning check'}));
    expect(mentor).toHaveBeenCalled(); expect(quiz).toHaveBeenCalled();
  });
});
