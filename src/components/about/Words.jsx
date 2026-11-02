import { Fragment } from 'react';

/**
 * Splits a line into word spans (never into letters, so Arabic keeps its joined letterforms).
 * Spaces stay as real text nodes between the inline-block words, so lines wrap normally.
 */
export default function Words({ text }) {
  const words = text.split(' ');
  return words.map((w, k) => (
    <Fragment key={k}>
      {k > 0 ? ' ' : null}
      <span className="w">{w}</span>
    </Fragment>
  ));
}
