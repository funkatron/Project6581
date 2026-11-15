// When package.json is bumped for an intentional release, set BASELINE to that
// release commit on main so stamp-build only auto-increments from the new floor.
export const BASELINE='753fb8dccb0c5502e2a1a60ffc3b4ca4d46d7e3a';
export function calculateVersion(base,commits){
  let [major,minor,patch]=base.split('.').map(Number);
  for(const message of commits.slice().reverse()){
    const subject=message.split('\n')[0].trim();
    if(!subject)continue;
    // Merged pull requests retain the PR title in the merge commit body.
    const title=subject.startsWith('Merge pull request')
      ?message.split('\n').map(s=>s.trim()).filter(Boolean).at(-1)??subject
      :subject;
    const breaking=/^[a-z]+(?:\([^)]+\))?!:/i.test(title)||/BREAKING CHANGE:/i.test(message);
    if(breaking){
      // Pre-1.0 development: even breaking changes advance minor only.
      // A 1.0 release requires an explicit, separate decision.
      if(major===0){minor++;patch=0}
      else {major++;minor=0;patch=0}
    }
    else if(/^feat(?:\([^)]+\))?:/i.test(title)){minor++;patch=0}
    else if(/^(fix|perf|refactor|docs|test|build|ci|chore)(?:\([^)]+\))?:/i.test(title)){patch++}
    else if(!/^Merge branch/i.test(subject)){patch++}
  }
  return [major,minor,patch].join('.');
}
