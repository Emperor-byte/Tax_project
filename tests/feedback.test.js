'use strict';

const { loadApp } = require('./helpers/loadApp');

const starsFixture = `
  <div id="star-rating">
    <span class="star" data-val="1"><i></i></span>
    <span class="star" data-val="2"><i></i></span>
    <span class="star" data-val="3"><i></i></span>
    <span class="star" data-val="4"><i></i></span>
    <span class="star" data-val="5"><i></i></span>
  </div>
  <span id="rating-label"></span>
  <div class="mini-stars" data-group="ease">
    <button><i></i></button><button><i></i></button><button><i></i></button>
    <button><i></i></button><button><i></i></button>
  </div>
`;

describe('setRating', () => {
  beforeEach(() => loadApp(starsFixture));

  test('fills the correct number of stars and sets the label', () => {
    setRating(3);
    const filled = document.querySelectorAll('#star-rating .star.filled');
    expect(filled.length).toBe(3);
    expect(document.getElementById('rating-label').textContent).toBe('Average');
    const icons = document.querySelectorAll('#star-rating .star i');
    expect(icons[0].className).toBe('ti ti-star-filled');
    expect(icons[4].className).toBe('ti ti-star');
  });

  test('shows the top label for a five-star rating', () => {
    setRating(5);
    expect(document.getElementById('rating-label').textContent).toBe('Excellent!');
    expect(document.querySelectorAll('#star-rating .star.filled').length).toBe(5);
  });
});

describe('setMiniRating', () => {
  beforeEach(() => loadApp(starsFixture));

  test('fills mini stars for the targeted group', () => {
    setMiniRating('ease', 4);
    const filled = document.querySelectorAll('.mini-stars[data-group="ease"] button.filled');
    expect(filled.length).toBe(4);
  });

  test('is a no-op for an unknown group', () => {
    expect(() => setMiniRating('missing', 2)).not.toThrow();
  });
});

describe('submitFeedback', () => {
  const fbFixture = `
    ${starsFixture}
    <div id="feedback-success" hidden></div>
    <button id="feedback-submit-btn"></button>
    <div class="feedback-form-card">
      <input placeholder="Company name or your full name" value="Walk-in User" />
      <select><option value="Shopping Plaza" selected>Shopping Plaza</option></select>
      <select><option value="Usability" selected>Usability</option></select>
      <textarea>Great service</textarea>
    </div>
  `;

  test('requires an overall rating before submitting', () => {
    loadApp(fbFixture);
    submitFeedback();
    expect(getTable('utaps_feedbacks')).toEqual([]);
    expect(document.getElementById('toast-container').textContent).toContain('overall rating');
  });

  test('persists feedback with ratings and comment', () => {
    jest.useFakeTimers();
    loadApp(fbFixture);
    setRating(5);
    setMiniRating('ease', 4);
    submitFeedback();
    jest.advanceTimersByTime(600);
    const feedbacks = getTable('utaps_feedbacks');
    expect(feedbacks.length).toBe(1);
    expect(feedbacks[0]).toMatchObject({
      userName: 'Walk-in User',
      entityType: 'Shopping Plaza',
      category: 'Usability',
      rating: 5,
      easeRating: 4,
      comment: 'Great service'
    });
    expect(document.getElementById('feedback-success').hidden).toBe(false);
    jest.useRealTimers();
  });

  test('uses the logged-in business name when available', () => {
    jest.useFakeTimers();
    loadApp(fbFixture);
    saveSession({ _id: 'u1', bizName: 'Acme Ltd', role: 'user' });
    setRating(4);
    submitFeedback();
    jest.advanceTimersByTime(600);
    const feedbacks = getTable('utaps_feedbacks');
    expect(feedbacks[0].userName).toBe('Acme Ltd');
    expect(feedbacks[0].userId).toBe('u1');
    jest.useRealTimers();
  });
});

describe('loadFeedbackSummary', () => {
  test('does not throw (placeholder implementation)', async () => {
    loadApp('');
    await expect(loadFeedbackSummary()).resolves.toBeUndefined();
  });
});
