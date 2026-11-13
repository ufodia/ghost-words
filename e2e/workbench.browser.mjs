import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

test('local workbench: analysis, evidence, export and responsive layout',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const done=[];
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
      await expect(page.locator('.cue-row')).toHaveCount(5);await expect(page.locator('#finding-count')).toContainText('flags');
      expect(await page.locator('audio').evaluate(el=>el.duration)).toBeGreaterThan(10);
      await page.locator('.cue-row').nth(1).getByRole('button',{name:'Remove line',exact:true}).click();const exported=await getDownload(page,page.locator('#export-srt'));expect(exported.content).not.toContain('Thank you for watching');
      await page.locator('#clear').click();await expect(page.locator('#export-srt')).toBeDisabled();
      await page.locator('#transcript-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.locator('#message')).toHaveClass(/error/);
      await page.locator('#demo').click();done.push('Playable real synthetic WAV','Five timed cues and energy flags','Reviewed SRT exclusion','Invalid import and clear state');
  await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false);
  expect(errors).toEqual([]);
});

for(const reset of ['clear','demo'])test(`a pending transcript cannot undo ${reset}`,async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{const read=File.prototype.text;File.prototype.text=function(){return this.name==='slow.srt'?new Promise(resolve=>{window.finishTranscript=()=>resolve('1\n00:00:00,000 --> 00:00:01,000\nStale transcript');}):read.call(this);};});
  await page.locator('#transcript-file').setInputFiles({name:'slow.srt',mimeType:'application/x-subrip',buffer:Buffer.from('slow')});
  await expect.poll(()=>page.evaluate(()=>typeof window.finishTranscript)).toBe('function');
  await page.locator(`#${reset}`).click();
  await page.evaluate(()=>window.finishTranscript());
  await expect(page.locator('.cue-row')).toHaveCount(reset==='clear'?0:5);
  await expect(page.locator('#session-name')).toHaveText(reset==='clear'?'Empty desk':'Synthetic demo session');
  await expect(page.locator('#message')).toHaveText(reset==='clear'?'Workspace cleared from memory.':'Demo loaded. Select the quiet-audio flag, then listen.');
});
