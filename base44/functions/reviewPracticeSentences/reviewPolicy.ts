export const normalize = (value) => String(value || '').normalize('NFC').trim().toLowerCase().replaceAll('’', "'").replace(/\s+/g, ' ');
const SUPPORT_WORDS = new Set(['essere', 'avere', 'fare', 'andare', 'volere', 'potere', 'stare', 'dare', 'dire', 'sapere', 'oggi', 'molto', 'bene', 'sempre', 'anche', 'già', 'ancora']);
const CONTENT_POS = new Set(['noun', 'verb', 'adjective', 'adverb']);
const AUXILIARIES = new Set(['essere', 'avere']);
const isText = (value, maximum) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const textList = (values, maximum) => Array.isArray(values) && values.length <= maximum && values.every(value => isText(value, 1500));
const validVocabulary = values => Array.isArray(values) && values.length <= 10000 && values.every(word => word && isText(word.italian, 200) && ['known', 'learning', 'to_learn'].includes(word.status));
const isCandidate = item => item && isText(item.sentence, 1500) && isText(item.translation, 1500)
  && (item.targetWord === undefined || isText(item.targetWord, 200))
  && Array.isArray(item.baseWords) && item.baseWords.length > 0 && item.baseWords.length <= 40
  && item.baseWords.every(word => word && isText(word.word, 200) && isText(word.translation, 300)
    && ['noun', 'verb', 'adjective', 'adverb', 'other'].includes(word.pos)
    && ['m', 'f', 'n'].includes(word.suggestedGender) && isText(word.suggestedTag, 80));

export function validReview(input) {
  const { sentences, mode, direction, selectedWords, vocabulary, allowedWords, avoid, allowRepeatedTargets } = input;
  return ['known', 'smart', 'tag', 'recent'].includes(mode) && ['it', 'he'].includes(direction)
    && Array.isArray(sentences) && sentences.length <= 15 && sentences.every(isCandidate)
    && textList(selectedWords, 10000) && selectedWords.length > 0 && selectedWords.every(word => word.length <= 200)
    && (mode !== 'smart' || validVocabulary(vocabulary))
    && (vocabulary === undefined || validVocabulary(vocabulary))
    && (allowedWords === undefined || textList(allowedWords, 10000))
    && (avoid === undefined || (avoid && textList(avoid.sentences, 10) && textList(avoid.focus, 10)))
    && (allowRepeatedTargets === undefined || typeof allowRepeatedTargets === 'boolean');
}

export function createPolicy({ mode, direction, selectedWords, allowedWords = selectedWords, vocabulary = [], avoid = { sentences: [], focus: [] }, allowRepeatedTargets = false }) {
  const selected = new Set(selectedWords.map(normalize));
  const familiar = new Set(vocabulary.filter(word => word.status === 'known' || word.status === 'learning').map(word => normalize(word.italian)));
  const allowed = new Set([...allowedWords.map(normalize), ...AUXILIARIES]);
  const seen = new Set(avoid.sentences.map(normalize));
  const usedTargets = new Set(avoid.focus.map(normalize));
  const strict = mode === 'known' || mode === 'recent';
  /* A selected word can be practised without appearing in baseWords: invariant
     expressions such as vabbè, boh or per favore are easy for the tutor to leave
     out of the metadata. The sentence text is checked as well, and word
     boundaries keep "sta" out of "stanza". */
  const phraseForm = value => normalize(value).replace(/[^\p{L}\p{M}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const focusForms = [...selected].filter(form => form.length > 1 && form === phraseForm(form));
  const check = candidate => {
    const lemmas = [...new Set(candidate.baseWords.map(word => normalize(word.word)))];
    const content = [...new Set(candidate.baseWords.filter(word => CONTENT_POS.has(word.pos) && !AUXILIARIES.has(normalize(word.word))).map(word => normalize(word.word)))];
    const italian = normalize(direction === 'he' ? candidate.translation : candidate.sentence);
    const reasons = [];
    const text = ` ${phraseForm(italian)} `;
    const inText = focusForms.filter(form => text.includes(` ${form} `));
    const practised = [...new Set([...lemmas.filter(lemma => selected.has(lemma)), ...inText])];
    if (!practised.length) reasons.push('No selected focus word is practised.');
    if (strict && lemmas.some(lemma => !allowed.has(lemma))) reasons.push('Content vocabulary is outside the selected Known words.');
    if (candidate.baseWords.some(word => word.pos !== 'noun' && word.suggestedGender !== 'n')) reasons.push('Only nouns may have masculine or feminine gender.');
    if (mode === 'smart' && familiar.size) {
      const familiarCount = content.filter(lemma => familiar.has(lemma)).length;
      const expected = Math.min(content.length - 1, Math.max(1, Math.round(content.length * 0.6)));
      if (content.length < 2 || familiarCount !== expected) reasons.push(`Smart Mix needs ${Math.max(1, expected)} familiar and ${Math.max(1, content.length - expected)} newer content lemmas; found ${familiarCount} familiar and ${content.length - familiarCount} newer.`);
    }
    // Old candidates without an explicit target get a stable, status-aware fallback.
    // Metadata order never determines a target; prefer an unused newer focus word.
    const targets = [...practised].sort((a, b) => {
      const rank = lemma => (SUPPORT_WORDS.has(lemma) ? 2 : 0) + (mode === 'smart' && familiar.has(lemma) ? 1 : 0);
      return rank(a) - rank(b) || a.localeCompare(b);
    });
    const target = candidate.targetWord ? normalize(candidate.targetWord) : (targets.find(lemma => !usedTargets.has(lemma)) || targets[0] || '');
    if (!target || !selected.has(target) || !practised.includes(target)) reasons.push('The primary target must be a selected dictionary entry actually used in the sentence.');
    if (seen.has(italian)) reasons.push('This Italian sentence already appears in the batch.');
    if (!allowRepeatedTargets && usedTargets.has(target)) reasons.push('This primary target was already practised; use a different target, keeping supporting words if needed.');
    return { italian, target, reasons };
  };
  return { check, commit({ italian, target }) { seen.add(italian); usedTargets.add(target); }, familiarWords: [...familiar] };
}