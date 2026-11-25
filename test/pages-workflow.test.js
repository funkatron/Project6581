import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The Pages workflow is YAML; these checks read it as text (no YAML parser in the test deps).
const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
const job=name=>{
 const start=workflow.indexOf('\n  '+name+':\n');
 assert.ok(start>=0,'job '+name);
 const next=workflow.slice(start+1).search(/\n {2}[a-z-]+:\n/);
 return next<0?workflow.slice(start):workflow.slice(start,start+1+next);
};

test('upload and deploy run in separate jobs, deploy after build',()=>{
 const build=job('build'),deploy=job('deploy');
 assert.match(build,/actions\/upload-pages-artifact@v3/);
 assert.doesNotMatch(build,/actions\/deploy-pages/);
 assert.match(deploy,/needs: build/);
 assert.doesNotMatch(deploy,/upload-pages-artifact|actions\/checkout/);
 assert.match(deploy,/environment:\n\s+name: github-pages/);
});

test('deploy uses the artifact name the build job uploaded, so a deploy-only re-run finds it',()=>{
 const build=job('build'),deploy=job('deploy');
 assert.match(build,/outputs:\n\s+artifact: \$\{\{ steps\.artifact\.outputs\.name \}\}/);
 assert.match(build,/name=github-pages-\$\{\{ github\.run_attempt \}\}/);
 assert.match(build,/name: \$\{\{ steps\.artifact\.outputs\.name \}\}/);
 const names=deploy.match(/artifact_name: (.+)/g);
 assert.deepEqual(names,Array(2).fill('artifact_name: ${{ needs.build.outputs.artifact }}'));
 assert.doesNotMatch(deploy,/run_attempt/);
});

test('a failed deploy is retried once after a pause',()=>{
 const deploy=job('deploy');
 assert.match(deploy,/id: deployment\n\s+continue-on-error: true/);
 assert.match(deploy,/if: steps\.deployment\.outcome == 'failure'\n\s+run: sleep 30/);
 assert.match(deploy,/id: deployment-retry\n\s+if: steps\.deployment\.outcome == 'failure'/);
 assert.match(deploy,/url: \$\{\{ steps\.deployment\.outputs\.page_url \|\| steps\.deployment-retry\.outputs\.page_url \}\}/);
});
