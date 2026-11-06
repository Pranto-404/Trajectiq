import {useEffect, useRef} from 'react';
import {motion} from 'motion/react';
import {QUESTIONS, useGame} from '@/store/index.js';
import {Button, Chip, Icon, spring, useReducedMotion} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import s from './sheets.module.css';

/** Three-question learning check. Answers are locked once chosen; the explanation is announced and focus moves to Next. */
export function QuizSheet({close}) {
  const t = useT();
  const reduced = useReducedMotion();
  const quiz = useGame(st => st.quiz);
  const act = useGame.getState().actions;
  const next = useRef(null), why = useRef(null);
  const answered = quiz && quiz.answers[quiz.i] !== undefined;
  useEffect(() => { if (answered) (next.current || why.current)?.focus(); }, [answered, quiz?.i]);
  if (!quiz) {
    return (
      <div className={s.sheet}>
        <p>{t('Check whether you can explain why stored data does not complete a science objective.')}</p>
        <Button variant="primary" data-autofocus onClick={() => act.quiz()}>{t('Start the 3-question check')}</Button>
      </div>
    );
  }
  const q = QUESTIONS[quiz.i], chosen = quiz.answers[quiz.i], last = quiz.i === QUESTIONS.length - 1;
  const correct = quiz.answers.filter((x, i) => x === QUESTIONS[i].answer).length;
  return (
    <div className={s.sheet}>
      <ol className={s.dots} aria-label={t('Progress')}>
        {QUESTIONS.map((_, i) => (
          <li key={i} aria-current={i === quiz.i ? 'step' : undefined} data-done={quiz.answers[i] !== undefined || undefined}>
            <motion.span layout={!reduced} transition={spring.snappy}>{i + 1}</motion.span>
          </li>
        ))}
      </ol>
      <p className="kicker">{t('Question {n} of {total}', {n: quiz.i + 1, total: QUESTIONS.length})}</p>
      <h3 id="quiz-q">{q.q}</h3>
      <div role="radiogroup" aria-labelledby="quiz-q" className={s.options}>
        {q.opts.map((o, i) => {
          const state = chosen === undefined ? '' : i === q.answer ? 'correct' : chosen === i ? 'incorrect' : '';
          return (
            <button key={i} type="button" role="radio" aria-checked={chosen === i} aria-disabled={chosen !== undefined || undefined} className={s.option} data-state={state || undefined} data-autofocus={i === 0 ? '' : undefined}
              onClick={() => { if (chosen === undefined) act.answerQuiz(i); }}>
              <span className={s.optMark} aria-hidden="true">{state === 'correct' ? <Icon name="check" size={16} /> : state === 'incorrect' ? <Icon name="close" size={16} /> : String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
              {state === 'correct' ? <span className="sr-only">{t('Correct answer')}</span> : state === 'incorrect' ? <span className="sr-only">{t('Your answer, not correct')}</span> : null}
            </button>
          );
        })}
      </div>
      {chosen !== undefined ? (
        <div ref={why} tabIndex={-1} role="status" className={s.why}>
          <Chip kind={chosen === q.answer ? 'pass' : 'warn'} size="sm">{chosen === q.answer ? t('Correct') : t('Not quite')}</Chip>
          <p>{q.why}</p>
          {!last ? <Button ref={next} variant="primary" onClick={() => act['next-question']()}>{t('Next question')}</Button> : (
            <>
              <p className={s.notice}>{t('{n} / {total} correct. This is a self-check, not a validated measure of educational impact.', {n: correct, total: QUESTIONS.length})}</p>
              <div className={s.row}><Button ref={next} variant="primary" onClick={close}>{t('Finish')}</Button><Button variant="ghost" onClick={() => act.quiz()}>{t('Try again')}</Button></div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
